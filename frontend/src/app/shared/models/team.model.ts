export interface Team {
  id: string;
  name: string;
  workers?: Worker[];
  workerCount?: number;
}

export interface Worker {
  id: string;
  tn: string;
  firstName: string;
  lastName: string;
  teams?: Team[];
}
