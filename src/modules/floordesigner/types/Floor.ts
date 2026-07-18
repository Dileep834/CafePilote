/** Floor within an outlet — independent layout canvas */

export type FloorId = string;

export interface Floor {
  id: FloorId;
  outletId: string;
  companyId?: string;
  brandId?: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
