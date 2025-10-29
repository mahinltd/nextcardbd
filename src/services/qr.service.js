import QRCode from 'qrcode';

/**
 * Generates a "Info-only" QR code as a Base64 data URI.
 * @param {string} text - The text to encode in the QR code.
 * @returns {Promise<string>} A promise that resolves with the data URI (e.g., "data:image/png;base64,...").
 */
export const generateQrCodeDataUri = async (text) => {
  try {
    // Generate QR code and return it as a Data URL
    const qrDataUrl = await QRCode.toDataURL(text, {
      // Options
      type: 'image/png',
      quality: 0.9,
      margin: 1,
      errorCorrectionLevel: 'M', // Medium error correction
    });
    return qrDataUrl;
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    throw new Error('QR Code generation failed');
  }
};