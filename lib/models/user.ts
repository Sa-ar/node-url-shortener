import { model, models, Schema, type Model } from "mongoose";

export type UserAttrs = {
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserAttrs>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export const User =
  (models.User as Model<UserAttrs> | undefined) ??
  model<UserAttrs>("User", userSchema);
