import { MemberType } from "@prisma/client";

export const DEFAULT_MEMBER_FEES: Record<MemberType, number> = {
  ANNUAL: 1200,   
  HONORARY: 5000, 
  LIFE: 25000,    
  INTERN: 1400,
  FOUNDER: 0,
};
