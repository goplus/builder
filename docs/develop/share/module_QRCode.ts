export type QRCodeOptions = {
    /** Width of the QR code in pixels */
    width?: number
    /** Height of the QR code in pixels */
    height?: number
    /** Margin size around the QR code */
    margin?: number
    /** Color configuration for QR code elements */
    color?: {
        /** Color of the dark squares */
        dark?: string
        /** Color of the light background */
        light?: string
    }
    /** Error correction level */
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
}

export type ProjectShareInfo = {
    /** Name of the project */
    projectName: string
    /** Full URL to the project */
    projectUrl: string
    /** Optional description text */
    description?: string
    /** Optional thumbnail image URL */
    thumbnail?: string
}

export type SharePlatform = {
    /** Unique platform identifier */
    id: string
    /** Human-readable platform name */
    name: string
    /** Function to generate platform-specific share URL */
    generateShareUrl: (projectInfo: ProjectShareInfo) => string
}

/**
 * Basic QR Code Generator
 * Provides fundamental QR code generation capabilities with customizable options.
 */
export interface QRCodeGenerator {
    /**
     * Generate QR code as base64 data URL
     */
    generateDataURL(text: string, options?: QRCodeOptions): Promise<string>
}

/**
 * Platform-Specific Share QR Code Generator
 * Extends basic QR code generation with platform-specific features.
 */
export interface ShareQRCodeGenerator extends QRCodeGenerator {
    /**
     * Generate QR code for specific sharing platform
     */
    generatePlatformQRCode(
        platformId: string,
        projectInfo: ProjectShareInfo,
        options?: QRCodeOptions
    ): Promise<string>

    /**
     * Generate generic project QR code without platform branding
     */
    generateProjectQRCode(
        projectInfo: ProjectShareInfo,
        options?: QRCodeOptions
    ): Promise<string>
}

/** Supported sharing platforms configuration */
export declare const sharePlatforms: Record<string, SharePlatform>

/** Global QR code generator instance */
export declare const qrCodeGenerator: QRCodeGenerator

/** Global share QR code generator instance */
export declare const shareQRCodeGenerator: ShareQRCodeGenerator

/**
 * Generate basic QR code from text
 * Convenience function wrapping qrCodeGenerator.generateDataURL()
 */
export declare function generateQRCode(
    text: string,
    options?: QRCodeOptions
): Promise<string>

/**
 * Generate platform-specific sharing QR code
 * Convenience function wrapping shareQRCodeGenerator.generatePlatformQRCode()
 */
export declare function generateShareQRCode(
    platformId: string,
    projectInfo: ProjectShareInfo,
    options?: QRCodeOptions
): Promise<string>

/**
 * Generate generic project QR code
 * Convenience function wrapping shareQRCodeGenerator.generateProjectQRCode()
 */
export declare function generateProjectQRCode(
    projectInfo: ProjectShareInfo,
    options?: QRCodeOptions
): Promise<string>