export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  particles?: string | null;
  email?: string | null;
  teams?: TeamBasic[];
}

export interface TeamBasic {
  id: string;
  name: string;
}

export interface DaySchedule {
  morning: number;
  afternoon: number;
}

export interface MemberSchedule {
  memberId: string;
  referenceDate: string;
  week1: DaySchedule[];
  week2: DaySchedule[];
}
