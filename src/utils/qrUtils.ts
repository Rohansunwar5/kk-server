import qr from 'qr-image';
/**
 * Generate a TOTP URI for QR codes (compatible with Google Authenticator)
 * @param secret - Base32 secret key
 * @param email - User's email
 * @param issuer - Your app name (default: 'YourApp')
 * @returns TOTP URI string
 */
// export function generateTOTPURI(secret: string, email: string, issuer: string = 'workplay'): string {
//     const encodedIssuer = encodeURIComponent(issuer);
//     const encodedEmail = encodeURIComponent(email);
//     return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}`;
//   }
  
  /**
   * Generate a QR code as SVG (pure TypeScript)
   * @param uri - TOTP URI to encode in QR code
   * @returns SVG string representation of QR code
   */


  export function generateQRCodeSVG(uri: string): string {
    try {
      // Validate URI first
      if (!uri.startsWith('otpauth://')) {
        throw new Error('Invalid TOTP URI format');
      }
  
      const qr_svg = qr.imageSync(uri, {
        type: 'svg',
        margin: 2,    // Standard margin
        size: 8,      // Optimal size for authenticator apps
        ec_level: 'M' // Medium error correction (better compatibility)
      });
      
      // Basic validation
      if (!qr_svg.toString().includes('<svg') || 
          !qr_svg.toString().includes('</svg>')) {
        throw new Error('Invalid SVG generated');
      }
      
      return qr_svg.toString();
    } catch (err) {
      console.error('QR generation failed:', err);
      throw new Error('Failed to generate QR code');
    }
  }
  
  // For CommonJS compatibility if needed
  export default { generateQRCodeSVG };