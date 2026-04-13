import { useState } from 'react';
import { useIndexSnapshots } from '../hooks/useIndexSnapshots';
import { getIndexById } from '../catalog/indexCatalog';
import { IndexCard } from './IndexCard';
import { IndexDetailSheet } from './IndexDetailSheet';
import type { IndexDataProvider } from '../provider/IndexDataProvider';

interface IndexGridProps {
  provider: IndexDataProvider;
  indexIds: string[];
}

/**
 * IndexGrid — fetches all selected index snapshots in one query and
 * distributes the results to individual IndexCard components.
 * Handles partial failures: a failing index shows an error card while
 * the rest of the grid renders normally.
 */
export function IndexGrid({ provider, indexIds }: IndexGridProps) {
  const { data, isLoading, isError } = useIndexSnapshots(provider, indexIds);
  const [activeIndexId, setActiveIndexId] = useState<string | null>(null);

  const activeDefinition = activeIndexId ? getIndexById(activeIndexId) : undefined;
  const activeSnapshot = data?.snapshots.find((snapshot) => snapshot.id === activeIndexId);
  const activeFailure = data?.partialFailures?.find((failure) => failure.id === activeIndexId);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {indexIds.map((id) => {
          const def = getIndexById(id);
          if (!def) return null;

          const snapshot = data?.snapshots.find((s) => s.id === id);
          const failure = data?.partialFailures?.find((f) => f.id === id);

          return (
            <IndexCard
              key={id}
              name={def.name}
              snapshot={snapshot}
              isLoading={isLoading}
              isError={isError || !!failure}
              errorReason={failure?.reason}
              onSelect={() => setActiveIndexId(id)}
            />
          );
        })}
      </div>

      {activeDefinition && !isLoading && (
        <IndexDetailSheet
          definition={activeDefinition}
          snapshot={activeSnapshot}
          errorReason={activeFailure?.reason}
          onClose={() => setActiveIndexId(null)}
        />
      )}
    </>
  );
}
