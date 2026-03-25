import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  Clock3,
  Gem,
  Heart,
  Image as ImageIcon,
  Settings,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Grid } from '@/components/layout/Grid'
import { ArtworkCard } from '@/components/artwork/ArtworkCard'
import { ArtworkCardSkeleton } from '@/components/ArtworkCardSkeleton'
import { EmptyState } from '@/components/EmptyState'
import { useArtworks, useUserProfile } from '@/services/artworkService'
import { useStellar } from '@/hooks/useStellar'

type ActiveTab = 'created' | 'collection' | 'history'

interface ProfileStatCard {
  label: string
  value: string
  helper: string
  icon: typeof Sparkles
}

interface ActivityItem {
  id: string
  type: 'minted' | 'purchased' | 'sold'
  artworkTitle: string
  amount: string
  currency: string
  timestamp: string
  status: 'confirmed' | 'pending'
}

function formatCurrency(amount: number) {
  return amount.toFixed(1)
}

function formatRelativeDate(timestamp: string) {
  const ms = Date.now() - new Date(timestamp).getTime()
  const hours = Math.floor(ms / (1000 * 60 * 60))

  if (hours < 24) {
    return `${Math.max(hours, 1)}h ago`
  }

  const days = Math.floor(hours / 24)
  if (days < 30) {
    return `${days}d ago`
  }

  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function isCreatorMatch(creator: string, userAddress: string) {
  if (!userAddress) return false

  const normalize = (value: string) => value.toLowerCase().replace(/\s/g, '')
  const normalizedCreator = normalize(creator)
  const normalizedAddress = normalize(userAddress)

  if (normalizedCreator === normalizedAddress) return true

  const creatorParts = creator.split('...')
  const addressParts = userAddress.split('...')

  if (creatorParts.length === 2) {
    const [prefix, suffix] = creatorParts
    return (
      normalizedAddress.startsWith(prefix.toLowerCase()) &&
      normalizedAddress.endsWith(suffix.toLowerCase())
    )
  }

  if (addressParts.length === 2) {
    const [prefix, suffix] = addressParts
    return (
      normalizedCreator.startsWith(prefix.toLowerCase()) &&
      normalizedCreator.endsWith(suffix.toLowerCase())
    )
  }

  return false
}

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('created')

  const { account } = useStellar()
  const { data: profile, isLoading: profileLoading } = useUserProfile()
  const { data: artworksResponse, isLoading: artworksLoading } = useArtworks({})

  const allArtworks = useMemo(
    () => artworksResponse?.pages.flatMap((page) => page.data) ?? [],
    [artworksResponse]
  )

  const displayAddress = account.publicKey || profile?.address || '—'
  const displayName = profile?.username || 'Artist'
  const shortAddress =
    displayAddress.length > 12
      ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`
      : displayAddress

  const createdArtworks = useMemo(
    () => allArtworks.filter((artwork) => isCreatorMatch(artwork.creator, displayAddress)),
    [allArtworks, displayAddress]
  )

  const collectionArtworks = useMemo(() => {
    const createdIds = new Set(createdArtworks.map((artwork) => artwork.id))
    const desiredCount = Math.min(profile?.stats.collected || 6, allArtworks.length)

    return allArtworks
      .filter((artwork) => !createdIds.has(artwork.id))
      .slice(0, desiredCount || 6)
  }, [allArtworks, createdArtworks, profile?.stats.collected])

  const activityFeed: ActivityItem[] = useMemo(() => {
    const mintedEvents = createdArtworks.slice(0, 5).map((artwork, index) => ({
      id: `mint-${artwork.id}`,
      type: 'minted' as const,
      artworkTitle: artwork.title,
      amount: artwork.price,
      currency: artwork.currency,
      timestamp: new Date(Date.now() - index * 1000 * 60 * 60 * 18).toISOString(),
      status: 'confirmed' as const,
    }))

    const purchaseEvents = collectionArtworks.slice(0, 5).map((artwork, index) => ({
      id: `purchase-${artwork.id}`,
      type: index % 2 === 0 ? ('purchased' as const) : ('sold' as const),
      artworkTitle: artwork.title,
      amount: artwork.price,
      currency: artwork.currency,
      timestamp: new Date(Date.now() - (index + 2) * 1000 * 60 * 60 * 11).toISOString(),
      status: index === 0 ? ('pending' as const) : ('confirmed' as const),
    }))

    return [...mintedEvents, ...purchaseEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [collectionArtworks, createdArtworks])

  const profileStatCards: ProfileStatCard[] = useMemo(() => {
    const createdCount = createdArtworks.length || profile?.stats.created || 0
    const collectedCount = collectionArtworks.length || profile?.stats.collected || 0
    const totalFavorites = profile?.stats.favorites || 0
    const totalValue = createdArtworks.reduce(
      (sum, artwork) => sum + Number.parseFloat(artwork.price),
      0
    )

    return [
      {
        label: 'Created Artworks',
        value: createdCount.toString(),
        helper: 'Minted and listed by you',
        icon: ImageIcon,
      },
      {
        label: 'Collection Size',
        value: collectedCount.toString(),
        helper: 'Artworks currently held',
        icon: Gem,
      },
      {
        label: 'Favorites',
        value: totalFavorites.toString(),
        helper: 'Liked across marketplace',
        icon: Heart,
      },
      {
        label: 'Creator Volume',
        value: `${formatCurrency(totalValue)} XLM`,
        helper: 'Total listed value',
        icon: TrendingUp,
      },
    ]
  }, [collectionArtworks.length, createdArtworks, profile?.stats.collected, profile?.stats.created, profile?.stats.favorites])

  const stats = profile?.stats ?? { created: 0, collected: 0, favorites: 0 }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <Card padding="lg" className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              {profile?.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt={displayName}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-3xl">🎨</span>
              )}
            </div>

            {profileLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-5 bg-secondary-200 rounded w-32 mx-auto" />
                <div className="h-4 bg-secondary-100 rounded w-24 mx-auto" />
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-secondary-900">{displayName}</h2>
                <p className="text-secondary-600 mb-2 text-sm font-mono">{shortAddress}</p>
                <p className="text-secondary-500 text-sm mb-4">{profile?.bio}</p>
              </>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-600">Created</span>
                <span className="font-medium">{profileLoading ? '—' : Math.max(stats.created, createdArtworks.length)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">Collected</span>
                <span className="font-medium">{profileLoading ? '—' : Math.max(stats.collected, collectionArtworks.length)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">Favorites</span>
                <span className="font-medium">{profileLoading ? '—' : stats.favorites}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Button variant="outline" size="md" fullWidth>
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Grid columns={2} gap="md" responsive>
            {profileStatCards.map((stat) => {
              const Icon = stat.icon

              return (
                <Card key={stat.label} className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-secondary-500">{stat.label}</p>
                    <p className="text-2xl font-semibold text-secondary-900">{profileLoading ? '—' : stat.value}</p>
                    <p className="text-xs text-secondary-500 mt-1">{stat.helper}</p>
                  </div>
                </Card>
              )
            })}
          </Grid>

          <Card padding="md">
            <div className="flex items-center space-x-5 mb-2 border-b border-secondary-200">
              <button
                className={`flex items-center space-x-2 font-medium pb-3 border-b-2 transition-colors ${
                  activeTab === 'created'
                    ? 'text-primary-600 border-primary-600'
                    : 'text-secondary-600 border-transparent'
                }`}
                onClick={() => setActiveTab('created')}
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Created</span>
              </button>
              <button
                className={`flex items-center space-x-2 font-medium pb-3 border-b-2 transition-colors ${
                  activeTab === 'collection'
                    ? 'text-primary-600 border-primary-600'
                    : 'text-secondary-600 border-transparent'
                }`}
                onClick={() => setActiveTab('collection')}
              >
                <Gem className="h-4 w-4" />
                <span>Collection</span>
              </button>
              <button
                className={`flex items-center space-x-2 font-medium pb-3 border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'text-primary-600 border-primary-600'
                    : 'text-secondary-600 border-transparent'
                }`}
                onClick={() => setActiveTab('history')}
              >
                <Clock3 className="h-4 w-4" />
                <span>History</span>
              </button>
            </div>

            <div className="mt-6">
              {activeTab === 'created' && (
                <>
                  {artworksLoading ? (
                    <Grid columns={3} gap="md" responsive={false}>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <ArtworkCardSkeleton key={i} />
                      ))}
                    </Grid>
                  ) : createdArtworks.length > 0 ? (
                    <Grid columns={3} gap="md" responsive={false}>
                      {createdArtworks.map((artwork) => (
                        <ArtworkCard
                          key={artwork.id}
                          artwork={artwork}
                          variant="default"
                          showPrice
                          showCreator={false}
                        />
                      ))}
                    </Grid>
                  ) : (
                    <EmptyState type="no-artworks" />
                  )}
                </>
              )}

              {activeTab === 'collection' && (
                <>
                  {artworksLoading ? (
                    <Grid columns={3} gap="md" responsive={false}>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <ArtworkCardSkeleton key={i} />
                      ))}
                    </Grid>
                  ) : collectionArtworks.length > 0 ? (
                    <Grid columns={3} gap="md" responsive={false}>
                      {collectionArtworks.map((artwork) => (
                        <ArtworkCard
                          key={`collection-${artwork.id}`}
                          artwork={artwork}
                          variant="default"
                          showPrice
                        />
                      ))}
                    </Grid>
                  ) : (
                    <EmptyState type="no-favorites" />
                  )}
                </>
              )}

              {activeTab === 'history' && (
                <div className="space-y-3">
                  {activityFeed.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between rounded-lg border border-secondary-200 bg-secondary-50/50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900">
                            {activity.type === 'minted' && 'Minted'}
                            {activity.type === 'purchased' && 'Purchased'}
                            {activity.type === 'sold' && 'Sold'} {activity.artworkTitle}
                          </p>
                          <p className="text-sm text-secondary-500">{formatRelativeDate(activity.timestamp)}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-secondary-900 flex items-center justify-end gap-1">
                          <ArrowUpRight className="h-3 w-3" />
                          {activity.amount} {activity.currency}
                        </p>
                        <span
                          className={`inline-flex mt-1 rounded-full px-2 py-0.5 text-xs ${
                            activity.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {!artworksLoading && activityFeed.length === 0 && (
                    <EmptyState type="no-artworks" />
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
