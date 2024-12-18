import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const NotFoundPage = () => {
  const searchParams = useSearchParams();

  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <p>Search Params: {searchParams?.toString() || ''}</p>
    </div>
  );
};

// Wrap the NotFoundPage in a Suspense boundary
const NotFoundWrapper = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <NotFoundPage />
  </Suspense>
);

export default NotFoundWrapper;
