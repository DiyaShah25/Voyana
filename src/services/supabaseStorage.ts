/**
 * Supabase Storage & Media Service for Voyana
 * Replaces Firebase Cloud Storage for:
 * 1. Travel Memories (Photos & Videos)
 * 2. Trip Documents (Flight E-Tickets, Hotel Vouchers, PDFs)
 * 3. User Avatars
 */

import { supabase } from './supabaseClient';
import type { TripMemory } from './collaborationService';

const MEMORIES_BUCKET = 'trip-memories';
const DOCUMENTS_BUCKET = 'trip-documents';

/**
 * Upload a photo or video to Supabase Storage bucket 'trip-memories'
 * Returns the public CDN URL for the uploaded asset.
 */
export async function uploadMemoryMedia(
  tripId: string,
  file: File
): Promise<{ url: string; error?: string }> {
  if (!supabase) {
    return { url: '', error: 'Supabase client not configured' };
  }

  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const cleanTripId = tripId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filePath = `${cleanTripId}/${uniqueSuffix}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(MEMORIES_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.warn('[SupabaseStorage] Upload error:', error.message);
      return { url: '', error: error.message };
    }

    const { data: publicData } = supabase.storage
      .from(MEMORIES_BUCKET)
      .getPublicUrl(data.path);

    return { url: publicData.publicUrl };
  } catch (err: any) {
    console.error('[SupabaseStorage] Exception uploading memory media:', err);
    return { url: '', error: err?.message || 'Upload failed' };
  }
}

/**
 * Upload a document (PDF / image / ticket) to Supabase Storage bucket 'trip-documents'
 */
export async function uploadTripDocumentFile(
  tripId: string,
  file: File
): Promise<{ url: string; error?: string }> {
  if (!supabase) {
    return { url: '', error: 'Supabase client not configured' };
  }

  try {
    const fileExt = file.name.split('.').pop() || 'pdf';
    const cleanTripId = tripId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${cleanTripId}/${Date.now()}_${safeName}`;

    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.warn('[SupabaseStorage] Document upload error:', error.message);
      return { url: '', error: error.message };
    }

    const { data: publicData } = supabase.storage
      .from(DOCUMENTS_BUCKET)
      .getPublicUrl(data.path);

    return { url: publicData.publicUrl };
  } catch (err: any) {
    console.error('[SupabaseStorage] Exception uploading document:', err);
    return { url: '', error: err?.message || 'Upload failed' };
  }
}

/**
 * Persist memory metadata into Supabase PostgreSQL table 'public.trip_memories'
 */
export async function saveMemoryToSupabase(
  tripId: string,
  memory: {
    uploadedBy: string;
    title: string;
    caption?: string;
    locationName?: string;
    imageUrl: string;
    mediaType?: 'photo' | 'video';
    tags?: string[];
    date?: string;
  }
): Promise<{ success: boolean; data?: TripMemory; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not configured' };
  }

  try {
    const record = {
      trip_id: tripId,
      uploaded_by: memory.uploadedBy,
      title: memory.title,
      caption: memory.caption || null,
      location_name: memory.locationName || null,
      image_url: memory.imageUrl,
      media_type: memory.mediaType || 'photo',
      tags: memory.tags || ['Travel', 'Moments'],
      date: memory.date || new Date().toISOString().split('T')[0],
      likes: [],
    };

    const { data, error } = await supabase
      .from('trip_memories')
      .insert([record])
      .select()
      .single();

    if (error) {
      console.warn('[SupabaseStorage] Save memory table error:', error.message);
      return { success: false, error: error.message };
    }

    const formatted: TripMemory = {
      id: data.id,
      tripId: data.trip_id,
      uploadedBy: data.uploaded_by,
      title: data.title,
      caption: data.caption,
      locationName: data.location_name,
      imageUrl: data.image_url,
      mediaType: data.media_type,
      date: data.date,
      likes: data.likes || [],
      tags: data.tags || [],
    };

    return { success: true, data: formatted };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Save failed' };
  }
}

/**
 * Fetch all memories from Supabase PostgreSQL table
 */
export async function fetchMemoriesFromSupabase(tripId?: string): Promise<TripMemory[]> {
  if (!supabase) return [];

  try {
    let query = supabase
      .from('trip_memories')
      .select('*')
      .order('created_at', { ascending: false });

    if (tripId && tripId !== 'all') {
      query = query.eq('trip_id', tripId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[SupabaseStorage] Fetch memories error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      tripId: row.trip_id,
      uploadedBy: row.uploaded_by,
      title: row.title,
      caption: row.caption,
      locationName: row.location_name,
      imageUrl: row.image_url,
      mediaType: row.media_type,
      date: row.date,
      likes: row.likes || [],
      tags: row.tags || [],
    }));
  } catch (err) {
    console.warn('[SupabaseStorage] Exception fetching memories:', err);
    return [];
  }
}
