import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  ReactNode,
  useMemo,
} from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import freighterApi from "@stellar/freighter-api";
import { ErrorHandler, AppError } from "@/utils/errorHandler";

export interface StellarAccount {
  publicKey: string;
  isConnected: boolean;
  balance?: string;
}

export interface StellarTransaction {
  hash: string;
  status: "pending" | "success" | "error";
  error?: AppError | null;
}

interface StellarContextType {
  account: StellarAccount;
  isLoading: boolean;
  network: "testnet" | "mainnet";
  server: StellarSdk.SorobanRpc.Server;
  horizonServer: StellarSdk.Horizon.Server;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  sendTransaction: (
    transaction: StellarSdk.Transaction
  ) => Promise<StellarTransaction>;
  createContractCall: (
    contractId: string,
    method: string,
    params?: any[]
  ) => any;
  refreshBalance: (explicitAddress?: string) => Promise<void>;
  setNetwork: (network: "testnet" | "mainnet") => void;
}

const StellarContext = createContext<StellarContextType | undefined>(undefined);

export function StellarProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<StellarAccount>({
    publicKey: "",
    isConnected: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [network, setNetwork] = useState<"testnet" | "mainnet">("testnet");

  const server = useMemo(
    () =>
      new StellarSdk.SorobanRpc.Server(
        network === "testnet"
          ? "https://soroban-testnet.stellar.org"
          : "https://soroban.stellar.org"
      ),
    [network]
  );

  const horizonServer = useMemo(
    () =>
      new StellarSdk.Horizon.Server(
        network === "testnet"
          ? "https://horizon-testnet.stellar.org"
          : "https://horizon.stellar.org"
      ),
    [network]
  );

  const refreshBalance = useCallback(
    async (explicitAddress?: string) => {
      const address = explicitAddress || account.publicKey;

      if (!address) {
        return;
      }

      try {
        const accountObj = await horizonServer.loadAccount(address);
        const balance =
          accountObj.balances.find((b: any) => b.asset_type === "native")
            ?.balance || "0";

        setAccount((prev: StellarAccount) => ({
          ...prev,
          balance,
        }));
      } catch (error) {
        const appError = ErrorHandler.handle(error);
        console.error("Failed to refresh balance:", appError.userMessage);
      }
    },
    [account.publicKey, horizonServer]
  );

  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    try {
      const publicKey = await freighterApi.getPublicKey();

      if (publicKey) {
        setAccount({
          publicKey,
          isConnected: true,
        });

        // Fetch balance immediately using the key we just got
        await refreshBalance(publicKey);
      } else {
        throw new Error("No public key returned from wallet");
      }
    } catch (error) {
      const appError = ErrorHandler.handle(error);
      console.error("Failed to connect wallet:", appError.userMessage);

      setAccount({
        publicKey: "",
        isConnected: false,
      });

      throw appError;
    } finally {
      setIsLoading(false);
    }
  }, [refreshBalance]);

  const disconnectWallet = useCallback(() => {
    setAccount({
      publicKey: "",
      isConnected: false,
    });
  }, []);

  const signTransaction = useCallback(
    async (xdr: string, networkPassphrase: string): Promise<string> => {
      try {
        if (!xdr || xdr.trim() === "") {
          throw new Error("Transaction XDR is required");
        }

        if (!networkPassphrase || networkPassphrase.trim() === "") {
          throw new Error("Network passphrase is required");
        }

        const result = await freighterApi.signTransaction(xdr, {
          networkPassphrase,
        });

        if (!result) {
          throw new Error("No signature returned from wallet");
        }

        return result;
      } catch (error) {
        const appError = ErrorHandler.handle(error);
        console.error("Failed to sign transaction:", appError.userMessage);
        throw appError;
      }
    },
    []
  );

  const sendTransaction = useCallback(
    async (
      transaction: StellarSdk.Transaction
    ): Promise<StellarTransaction> => {
      try {
        if (!transaction) {
          throw new Error("Transaction is required");
        }

        const networkPassphrase =
          network === "testnet"
            ? StellarSdk.Networks.TESTNET
            : StellarSdk.Networks.PUBLIC;

        const signedXdr = await signTransaction(
          transaction.toXDR(),
          networkPassphrase
        );

        const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
          signedXdr,
          networkPassphrase
        );

        const result = await server.sendTransaction(signedTransaction);

        if (result.status === "PENDING") {
          try {
            await Promise.race([
              server.getTransaction(result.hash),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Transaction confirmation timeout")),
                  30000
                )
              ),
            ]);

            return {
              hash: result.hash,
              status: "success",
            };
          } catch (confirmError) {
            const appError = ErrorHandler.handle(confirmError);
            return {
              hash: result.hash,
              status: "error",
              error: appError,
            };
          }
        } else {
          const errorMessage = `Transaction failed: ${result.status}`;
          return {
            hash: result.hash,
            status: "error",
            error: ErrorHandler.handle(new Error(errorMessage)),
          };
        }
      } catch (error) {
        const appError = ErrorHandler.handle(error);
        console.error("Failed to send transaction:", appError.userMessage);
        return {
          hash: "",
          status: "error",
          error: appError,
        };
      }
    },
    [network, server, signTransaction]
  );

  const createContractCall = useCallback(
    (contractId: string, method: string, params: any[] = []) => {
      const contract = new StellarSdk.Contract(contractId);
      return contract.call(method, ...params);
    },
    []
  );

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const publicKey = await freighterApi.getPublicKey();
        if (publicKey) {
          setAccount({
            publicKey,
            isConnected: true,
          });
          await refreshBalance(publicKey);
        }
      } catch (error) {
        // Wallet not connected
      }
    };

    checkConnection();
  }, [refreshBalance]);

  const value = {
    account,
    isLoading,
    network,
    server,
    horizonServer,
    connectWallet,
    disconnectWallet,
    sendTransaction,
    createContractCall,
    refreshBalance,
    setNetwork,
  };

  return (
    <StellarContext.Provider value={value}>{children}</StellarContext.Provider>
  );
}

export function useStellar() {
  const context = useContext(StellarContext);
  if (context === undefined) {
    throw new Error("useStellar must be used within a StellarProvider");
  }
  return context;
}
