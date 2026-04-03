import { supabase } from './supabase.js';

// Builds

export const fetchMyBuilds = async (userId) => {
  const { data, error } = await supabase
    .from('builds')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) console.error('fetchMyBuilds:', error.message);
  return data || [];
};

export const fetchPublicBuilds = async () => {
  const { data, error } = await supabase
    .from('builds')
    .select('*, profiles!builds_user_id_profiles_fk(username, bio, avatar_colour)')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false });
  if (error) console.error('fetchPublicBuilds:', error.message);
  return data || [];
};

export const insertBuild = async (build) => {
  const { data, error } = await supabase
    .from('builds')
    .insert(build)
    .select()
    .single();
  if (error) console.error('insertBuild:', error.message);
  return data;
};

export const updateBuild = async (id, updates) => {
  const { data, error } = await supabase
    .from('builds')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) console.error('updateBuild:', error.message);
  return data;
};

// Inventory (parts per build)

export const fetchBuildParts = async (buildId) => {
  const { data, error } = await supabase
    .from('fpv_inventory')
    .select('*')
    .eq('build_id', buildId)
    .order('part_type');
  if (error) console.error('fetchBuildParts:', error.message);
  return data || [];
};

export const insertParts = async (parts) => {
  const { data, error } = await supabase
    .from('fpv_inventory')
    .insert(parts)
    .select();
  if (error) console.error('insertParts:', error.message);
  return data || [];
};

// Suggestions

export const insertSuggestions = async (suggestions) => {
  const { data, error } = await supabase
    .from('fpv_suggestions')
    .insert(suggestions)
    .select();
  if (error) console.error('insertSuggestions:', error.message);
  return data || [];
};

export const fetchBuildSuggestions = async (buildId) => {
  const { data, error } = await supabase
    .from('fpv_suggestions')
    .select('*')
    .eq('build_id', buildId)
    .eq('state', 'unconfirmed')
    .order('part_type');
  if (error) console.error('fetchBuildSuggestions:', error.message);
  return data || [];
};

export const updateSuggestion = async (id, updates) => {
  const { data, error } = await supabase
    .from('fpv_suggestions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) console.error('updateSuggestion:', error.message);
  return data;
};

// Likes

export const fetchMyLikes = async (userId) => {
  const { data, error } = await supabase
    .from('likes')
    .select('build_id, like_type')
    .eq('user_id', userId);
  if (error) console.error('fetchMyLikes:', error.message);
  const map = { build: {}, flight_proof: {} };
  (data || []).forEach(l => { map[l.like_type][l.build_id] = true; });
  return map;
};

export const fetchLikeCounts = async (buildIds) => {
  if (!buildIds.length) return {};
  const { data, error } = await supabase
    .from('likes')
    .select('build_id, like_type')
    .in('build_id', buildIds);
  if (error) console.error('fetchLikeCounts:', error.message);
  const counts = {};
  (data || []).forEach(l => {
    if (!counts[l.build_id]) counts[l.build_id] = { build: 0, flight_proof: 0 };
    counts[l.build_id][l.like_type]++;
  });
  return counts;
};

export const toggleLike = async (userId, buildId, likeType) => {
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('build_id', buildId)
    .eq('like_type', likeType)
    .single();

  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('likes').insert({ user_id: userId, build_id: buildId, like_type: likeType });
    return true;
  }
};

// Photos

export const uploadBuildPhoto = async (userId, buildId, file) => {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${buildId}.${ext}`;

  console.log('Uploading build photo:', path, file.size, 'bytes');

  const { data: uploadData, error } = await supabase.storage
    .from('build-photos')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('uploadBuildPhoto failed:', error.message, error);
    alert('Photo upload failed: ' + error.message);
    return null;
  }

  console.log('Upload success:', uploadData);

  const { data: { publicUrl } } = supabase.storage
    .from('build-photos')
    .getPublicUrl(path);

  console.log('Public URL:', publicUrl);
  return publicUrl;
};

export const uploadPartPhoto = async (userId, partId, file) => {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/parts/${partId}.${ext}`;

  const { error } = await supabase.storage
    .from('build-photos')
    .upload(path, file, { upsert: true });

  if (error) {
    console.error('uploadPartPhoto:', error.message);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('build-photos')
    .getPublicUrl(path);

  // Update the part record
  await supabase.from('fpv_inventory').update({ photo_url: publicUrl }).eq('id', partId);
  return publicUrl;
};

// Profiles

export const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) console.error('fetchProfile:', error.message);
  return data;
};

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) console.error('updateProfile:', error.message);
  return data;
};
