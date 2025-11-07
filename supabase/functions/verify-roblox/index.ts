import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reserved usernames that cannot be used for account creation
const RESERVED_USERNAMES = ['solzz0_0', 'admin', 'administrator', 'moderator', 'system', 'support', 'owner', 'staff'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { robloxUsername, verificationCode } = await req.json();
    
    // Validate that username is not reserved
    if (RESERVED_USERNAMES.includes(robloxUsername.toLowerCase())) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This username is reserved and cannot be used. Please use a different Roblox account.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('Verifying Roblox user:', robloxUsername, 'with code:', verificationCode);

    // Get Roblox user ID from username
    const userSearchResponse = await fetch(
      `https://users.roblox.com/v1/usernames/users`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [robloxUsername], excludeBannedUsers: true })
      }
    );

    if (!userSearchResponse.ok) {
      throw new Error('Failed to find Roblox user');
    }

    const userData = await userSearchResponse.json();
    
    if (!userData.data || userData.data.length === 0) {
      throw new Error('Roblox user not found');
    }

    const robloxId = userData.data[0].id;
    console.log('Found Roblox ID:', robloxId);

    // Get user profile/bio
    const profileResponse = await fetch(
      `https://users.roblox.com/v1/users/${robloxId}`
    );

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch Roblox profile');
    }

    const profileData = await profileResponse.json();
    const bio = profileData.description || '';
    
    console.log('Roblox bio:', bio);

    // Get Roblox avatar headshot
    const avatarResponse = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=false`
    );
    
    let avatarUrl = null;
    if (avatarResponse.ok) {
      const avatarData = await avatarResponse.json();
      if (avatarData.data && avatarData.data.length > 0) {
        avatarUrl = avatarData.data[0].imageUrl;
      }
    }

    // Check if verification code is in bio
    if (!bio.includes(verificationCode)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Verification code not found in Roblox bio. Please add the code to your bio and try again.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create or get user account
    const email = `${robloxUsername.toLowerCase()}@roblox.mm2pvp.temp`;
    const password = crypto.randomUUID();

    let userId: string | undefined;
    
    // Try to sign up new user
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        roblox_username: robloxUsername,
        roblox_id: robloxId
      }
    });

    if (signUpData?.user) {
      userId = signUpData.user.id;
      console.log('Created new user:', userId);
    } else if (signUpError?.code === 'email_exists') {
      // User exists, find them by email
      console.log('User already exists, finding by email...');
      
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error listing users:', listError);
        throw new Error('Failed to find existing user account');
      }
      
      const existingUser = users.users.find(u => u.email === email);
      if (existingUser) {
        userId = existingUser.id;
        console.log('Found existing user:', userId);
        
        // Update the existing user's password so we can sign them in
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password });
        if (updateError) {
          console.error('Error updating password:', updateError);
          throw new Error('Failed to update user password');
        }
      }
    } else if (signUpError) {
      console.error('Signup error:', signUpError);
      throw signUpError;
    }

    if (!userId) {
      throw new Error('Failed to create or find user account');
    }

    // Update profile with Roblox data
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        roblox_username: robloxUsername,
        roblox_id: robloxId,
        avatar_url: avatarUrl,
        verification_code: verificationCode,
        verified_at: new Date().toISOString(),
        username: robloxUsername // Also update the username
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Profile update error:', updateError);
    }

    // Mark verification code as used
    await supabase
      .from('verification_codes')
      .update({ used: true, user_id: userId })
      .eq('code', verificationCode);

    // Sign in the user to get session tokens
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // If password sign-in fails, generate a magic link
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

      if (linkError || !linkData) {
        console.error('Failed to generate session');
        throw new Error('Failed to create session');
      }

      // Return the magic link for the user to use
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Roblox account verified successfully!',
          redirect_url: linkData.properties.action_link,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verification successful for:', robloxUsername);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Roblox account verified successfully!',
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Verification failed';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});