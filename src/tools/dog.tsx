import { useState, useEffect, useRef } from "react";

const MAX_CACHE_SIZE = 200;

interface DogApiResponse {
  message: string;
  status: string;
}

export default function Dog() {
  const [currentImage, setCurrentImage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const cacheRef = useRef<string[]>([]);
  const isCachingCompleteRef = useRef(false);

  const fetchNewDogImage = async () => {
    try {
      const response = await fetch("https://dog.ceo/api/breeds/image/random");
      const data: DogApiResponse = await response.json();

      if (data.status === "success" && data.message) {
        const imageUrl = data.message;

        // Preload the image
        const img = new Image();
        img.onload = () => {
          setCurrentImage(imageUrl);
          setIsLoading(false);

          // Add to cache if not already there and cache not full
          if (!isCachingCompleteRef.current && !cacheRef.current.includes(imageUrl)) {
            cacheRef.current.push(imageUrl);

            // Check if cache is now full
            if (cacheRef.current.length >= MAX_CACHE_SIZE) {
              isCachingCompleteRef.current = true;
              console.log(`Cache complete! ${MAX_CACHE_SIZE} dog pictures cached.`);
            }
          }
        };
        img.src = imageUrl;
      }
    } catch (error) {
      console.error("Error fetching dog image:", error);
    }
  };

  const getRandomCachedImage = () => {
    if (cacheRef.current.length === 0) return;

    const randomIndex = Math.floor(Math.random() * cacheRef.current.length);
    const imageUrl = cacheRef.current[randomIndex];

    setCurrentImage(imageUrl);
    setIsLoading(false);
  };

  useEffect(() => {
    // Initial fetch
    if (!isCachingCompleteRef.current) {
      fetchNewDogImage();
    } else {
      getRandomCachedImage();
    }

    // Set up interval to fetch/cycle every second
    const interval = setInterval(() => {
      if (isCachingCompleteRef.current) {
        getRandomCachedImage();
      } else {
        fetchNewDogImage();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      {currentImage && (
        <img
          src={currentImage}
          alt="Random dog"
          className="max-w-full max-h-screen object-contain"
        />
      )}
    </div>
  );
}
