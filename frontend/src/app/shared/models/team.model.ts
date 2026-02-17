export interface Team {
  id: string;
  name: string;
  members?: Member[];
  memberCount?: number;
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  particles?: string | null;
  email?: string | null;
  teams?: Team[];
}
