import {useEffect, useState} from 'react';
import {getImageAccent} from '../imageAccent';

export const useImageAccent = (
  imageUri: string | undefined,
  fallback: string,
): string => {
  const [accent, setAccent] = useState(fallback);

  useEffect(() => {
    let active = true;
    setAccent(fallback);

    getImageAccent(imageUri, fallback).then(nextAccent => {
      if (active) {
        setAccent(nextAccent);
      }
    });

    return () => {
      active = false;
    };
  }, [fallback, imageUri]);

  return accent;
};
