import { useState } from 'react'
import { useArtworks, type Artwork, type ArtworksFilters } from '@/services/artworkService'
import { ArtworkGrid } from '@/components/ArtworkGrid'
import { Search, Filter } from 'lucide-react'

export function ExplorePage() {
  const [filters, setFilters] = useState<ArtworksFilters>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilteringLoading, setIsFilteringLoading] = useState(false)

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useArtworks(filters)

  const artworks: Artwork[] = data?.pages.flatMap((page) => page.data) || []

  const handlePurchase = (artwork: Artwork) => {
    console.log('Purchase clicked for:', artwork.title)
  }

  const handleClearFilters = () => {
    setFilters({})
    setSearchTerm('')
  }
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Trigger loading state to show feedback
    setIsFilteringLoading(true)
    setTimeout(() => setIsFilteringLoading(false), 500)
  }

  const handleFilterChange = (category: string) => {
    setIsFilteringLoading(true)
    setFilters(category === 'All' ? {} : { category })
    // Reset filtering state after a brief moment to show skeleton loaders
    setTimeout(() => setIsFilteringLoading(false), 300)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-section pb-2">
        <h1 className="heading-mobile mb-6">Explore Artworks</h1>
        
        <div className="mobile-container mb-8">
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div cl
              type="submit"
              variant="primary"
              size="md"
              className="hidden sm:block"
              loading={isFilteringLoading}
              disabled={isFilteringLoading}
            >
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="sm:hidden"
              aria-label="Filters"
              loading={isFilteringLoading}
              disabled={isFilteringLoading}
            
                placeholder="Search artworks, creators..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) =handleFilterChange(category)}
                variant={(
                  filters.category === category || (!filters.category && category === 'All')
                    ? 'primary'
                    : 'outline'
                )}
                size="sm"
                className="whitespace-nowrap rounded-full"
                disabled={isFilteringLoading}
                loading={isFilteringLoading && (filters.category === category || (!filters.category && category === 'All'))}
            </Button>
          </form>
          
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
            {['All', 'Trending', 'New', 'Photography', '3D Render'].map((category) => (
              <Button
                key={category}
                onClick={() => setFilters(category === 'All' ? {} : { category })}
                variant={(
                  filters.category === category || (!filters.category && category === 'All')
                    ? 'primary'
                    : 'outline'
                )}
                size="sm"
                className="whitespace-nowrap rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="mobile-section pt-0">
        <ArtworkGrid
          artworks={artworks}
          isLoading={isLoading}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => {
            if (hasNextPage) fetchNextPage()
          }}
          onPurchase={handlePurchase}
          onClearFilters={handleClearFilters}
          hasFilters={Object.keys(filters).length > 0}
        />
      </div>
    </div>
  )
}
