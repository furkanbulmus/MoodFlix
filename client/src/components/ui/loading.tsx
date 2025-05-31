export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-netflix-red"></div>
    </div>
  );
}

export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="text-muted text-lg mt-4">{message}</p>
      </div>
    </div>
  );
}
