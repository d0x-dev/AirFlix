import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import type {EpisodeLink} from '../providers/types';
import {createZustandStorage} from '../storage/StorageService';

export interface ContinueWatchingItem {
  id: string;
  title: string;
  episodeTitle?: string;
  episode: EpisodeLink;
  type: string;
  poster?: string;
  background?: string;
  providerValue: string;
  infoUrl: string;
  position: number;
  duration: number;
  updatedAt: number;
}

interface ContinueWatchingState {
  items: ContinueWatchingItem[];
  upsertItem: (item: ContinueWatchingItem) => void;
  updateProgress: (id: string, position: number, duration: number) => void;
  removeItem: (id: string) => void;
}

const useContinueWatchingStore = create<ContinueWatchingState>()(
  persist(
    set => ({
      items: [],
      upsertItem: item =>
        set(state => ({
          items: [
            item,
            ...state.items.filter(existing => existing.id !== item.id),
          ]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 30),
        })),
      updateProgress: (id, position, duration) =>
        set(state => ({
          items: state.items
            .map(item =>
              item.id === id
                ? {...item, position, duration, updatedAt: Date.now()}
                : item,
            )
            .sort((a, b) => b.updatedAt - a.updatedAt),
        })),
      removeItem: id =>
        set(state => ({items: state.items.filter(item => item.id !== id)})),
    }),
    {
      name: 'continue-watching-storage',
      storage: createJSONStorage(() => createZustandStorage()),
    },
  ),
);

export default useContinueWatchingStore;
