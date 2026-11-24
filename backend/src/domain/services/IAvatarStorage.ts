export type Avatar = { url: string; publicId: string };

export interface IAvatarStorage {
  upload(image: string): Promise<Avatar>;
}
