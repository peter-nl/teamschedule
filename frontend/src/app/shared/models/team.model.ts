export interface Team {
  id: string;
  name: string;
  workers?: Worker[];
  workerCount?: number;
}

export interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  particles?: string | null;
  teams?: Team[];
}
