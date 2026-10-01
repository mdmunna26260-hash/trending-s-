import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

export const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
export const UPLOAD_PUBLIC_PREFIX = '/uploads'

export interface ProcessedImage {
  path: string
  width: number
  height: number
  placeholder: string
}

const WIDTHS = [400, 800, 1200, 1600]

/**
 * Converts an uploaded image into responsive WebP derivatives plus a tiny
 * base64 placeholder for blur-up loading. Returns the largest file's public
 * path and its intrinsic dimensions.
 */
export async function processAndStoreImage(buffer: Buffer, folder = 'products'): Promise<ProcessedImage> {
  await mkdir(path.join(UPLOAD_DIR, folder), { recursive: true })
  const id = crypto.randomBytes(12).toString('hex')
  const image = sharp(buffer, { failOn: 'none' }).rotate()
  const metadata = await image.metadata()
  const baseWidth = metadata.width ?? 1600
  const baseHeight = metadata.height ?? 1200

  const largestWidth = Math.min(baseWidth, Math.max(...WIDTHS))
  const largestHeight = Math.round((baseHeight / baseWidth) * largestWidth)

  const outputs = await Promise.all(
    WIDTHS.filter((width) => width <= largestWidth).map(async (width) => {
      const height = Math.round((baseHeight / baseWidth) * width)
      const file = `${id}-${width}.webp`
      await image
        .clone()
        .resize({ width, height, fit: 'cover', withoutEnlargement: true })
        .webp({ quality: width <= 800 ? 82 : 78, effort: 4 })
        .toFile(path.join(UPLOAD_DIR, folder, file))
      return { width, height, file }
    }),
  )

  if (!outputs.length) {
    const file = `${id}-${largestWidth}.webp`
    await image
      .clone()
      .resize({ width: largestWidth, height: largestHeight, fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(path.join(UPLOAD_DIR, folder, file))
    outputs.push({ width: largestWidth, height: largestHeight, file })
  }

  const largest = outputs[outputs.length - 1]

  const placeholderBuffer = await image
    .clone()
    .resize({ width: 16, fit: 'inside' })
    .webp({ quality: 30 })
    .toBuffer()
  const placeholder = `data:image/webp;base64,${placeholderBuffer.toString('base64')}`

  await writeFile(
    path.join(UPLOAD_DIR, folder, `${id}.json`),
    JSON.stringify({ variants: outputs, width: largest.width, height: largest.height }),
  )

  return {
    path: `${UPLOAD_PUBLIC_PREFIX}/${folder}/${largest.file}`,
    width: largest.width,
    height: largest.height,
    placeholder,
  }
}


export function isSupportedImage(type: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(type)
}
