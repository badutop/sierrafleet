import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { email, role, modules, driver_id } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email requis' }, { status: 400 });
    }

    // Inviter l'utilisateur (user ou admin)
    const base44Role = role === 'admin' ? 'admin' : 'user';
    await base44.users.inviteUser(email, base44Role);

    // Sauvegarder la config en attente (sera appliquée au premier login)
    const pendingData = {
      email: email.toLowerCase(),
      role,
      modules: modules || [],
      applied: false
    };
    if (role === 'chauffeur' && driver_id) {
      pendingData.driver_id = driver_id;
    }
    await base44.asServiceRole.entities.PendingUserConfig.create(pendingData);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});