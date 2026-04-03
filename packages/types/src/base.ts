export type Uuid = string;
export type IsoDateString = string;

export type AppRelease = "mvp" | "v2" | "v3";

export interface TimestampedEntity {
  createdAt: IsoDateString;
  updatedAt?: IsoDateString | null;
}
