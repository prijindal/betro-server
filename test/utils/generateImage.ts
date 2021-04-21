import jpeg from "jpeg-js";

/**
 * Generates an random colored image with specified width, height and quality
 * @param width width of the image
 * @param height height of the image
 * @param quality quality of the image
 * @param callback callback
 */
export const generateImage = (
  width: number,
  height: number,
  quality: number
): Buffer => {
  const frameData = Buffer.alloc(width * height * 4);
  let i = 0;
  while (i < frameData.length) {
    frameData[i++] = Math.floor(Math.random() * 256);
  }
  const rawImageData = {
    data: frameData,
    width: width,
    height: height,
  };
  const jpegImageData = jpeg.encode(rawImageData, quality);

  return jpegImageData.data;
};
