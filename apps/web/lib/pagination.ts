// The candidate-side counterpart to the backend's Page[T] envelope
// (app/schemas/pagination.py) -- one shared shape for every paginated
// candidate list, so each lib/*/client.ts doesn't redeclare it.
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};
