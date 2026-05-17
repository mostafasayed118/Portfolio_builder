import QRCode from "qrcode";

export async function generateQRCode(
  url: string,
  options?: {
    size?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  },
): Promise<string> {
  const {
    size = 120,
    margin = 1,
    darkColor = "#1a1a2e",
    lightColor = "#ffffff",
  } = options ?? {};

  return await QRCode.toDataURL(url, {
    width: size,
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: "M",
  });
}
