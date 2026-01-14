export interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  particles?: string | null;
  teams?: TeamBasic[];
}

export interface TeamBasic {
  id: string;
  name: string;
}
