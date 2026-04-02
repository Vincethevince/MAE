interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export function RatingStars({ rating, maxStars = 5, size = "md" }: RatingStarsProps) {
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} von ${maxStars} Sternen`}>
      {Array.from({ length: maxStars }, (_, i) => {
        const starValue = i + 1;
        const filled = rating >= starValue;
        const half = !filled && rating >= starValue - 0.5;

        if (half) {
          return (
            <svg
              key={i}
              className={`${sizeClass} text-yellow-400`}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={`half-${i}`}>
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="none" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                fill={`url(#half-${i})`}
                stroke="currentColor"
                strokeWidth="1.5"
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              />
            </svg>
          );
        }

        return (
          <svg
            key={i}
            className={`${sizeClass} ${filled ? "text-yellow-400" : "text-gray-200"}`}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        );
      })}
    </div>
  );
}
