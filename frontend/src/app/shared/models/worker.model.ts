export interface Worker {
  id: string;
  tn: string;
  firstName: string;
  lastName: string;
  teams?: TeamBasic[];
}

export interface TeamBasic {
  id: string;
  name: string;
}
