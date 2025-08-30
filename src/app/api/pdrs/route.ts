import { NextRequest, NextResponse } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  handleApiError,
  authenticateRequest,
  extractPagination,
  createPaginatedResponse 
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';
import { computeAustralianFY } from '@/lib/financial-year';
import { transformPDRFields } from '@/lib/case-transform';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    console.log('GET PDRs: Authenticated user:', { id: user.id, email: user.email, role: user.role });
    const url = new URL(request.url);
    const { page, limit, offset } = extractPagination(url);
    
    const supabase = await createClient();

    // Build query based on user role
    let query = supabase
      .from('pdrs')
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(id, first_name, last_name, email, role),
        period:pdr_periods(*),
        goals(id, title, priority, employee_rating, ceo_rating),
        behaviors(id, employee_rating, ceo_rating),
        mid_year_review:mid_year_reviews(id, submitted_at),
        end_year_review:end_year_reviews(id, submitted_at, employee_overall_rating, ceo_overall_rating)
      `);

    // Apply role-based filtering (RLS will also enforce this)
    if (user.role !== 'CEO') {
      query = query.eq('user_id', user.id);
    }

    // Add additional filters
    const status = url.searchParams.get('status');
    const periodId = url.searchParams.get('period');
    const search = url.searchParams.get('search');
    const current = url.searchParams.get('current'); // Check for current PDR

    if (status) {
      query = query.eq('status', status as any);
    }

    if (periodId) {
      query = query.eq('period_id', periodId);
    }

    // Handle current PDR filtering
    if (current === 'true') {
      const currentFY = computeAustralianFY();
      console.log('GET PDRs: Current FY computed:', currentFY);
      console.log('GET PDRs: Filtering by fy_label:', currentFY.label);
      query = query.eq('fy_label', currentFY.label);
    }

    // For search, we need to handle it differently in Supabase
    // We'll get all PDRs first, then filter on the frontend if CEO searching
    // This is less efficient but simpler for now - can be optimized later with a custom RPC function

    // Get total count first (with same filters)
    let countQuery = supabase
      .from('pdrs')
      .select('*', { count: 'exact', head: true });

    // Apply same filters as main query for accurate count
    if (user.role !== 'CEO') {
      countQuery = countQuery.eq('user_id', user.id);
    }
    if (status) {
      countQuery = countQuery.eq('status', status as any);
    }
    if (periodId) {
      countQuery = countQuery.eq('period_id', periodId);
    }
    if (current === 'true') {
      const currentFY = computeAustralianFY();
      countQuery = countQuery.eq('fy_label', currentFY.label);
    }

    const { count: total, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    // Get PDRs with pagination
    query = query
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: pdrs, error } = await query;

    if (error) {
      throw error;
    }

    // Debug: Log found PDRs
    console.log('GET PDRs: Found PDRs count:', pdrs?.length || 0);
    if (current === 'true') {
      console.log('GET PDRs: Current PDR search results:', pdrs?.map(p => ({ 
        id: p.id, 
        fy_label: p.fy_label, 
        status: p.status, 
        user_id: p.user_id 
      })));
    }

    // Apply search filter if needed (for CEO users)
    let filteredPDRs = pdrs || [];
    if (search && user.role === 'CEO') {
      const searchLower = search.toLowerCase();
      filteredPDRs = pdrs?.filter(pdr => {
        const userData = pdr.user as any;
        return userData?.first_name?.toLowerCase().includes(searchLower) ||
               userData?.last_name?.toLowerCase().includes(searchLower) ||
               userData?.email?.toLowerCase().includes(searchLower);
      }) || [];
    }

    // Transform PDR fields to camelCase
    const transformedPDRs = filteredPDRs.map(transformPDRFields);

    // Debug: Log transformation results
    console.log('GET PDRs: Before transformation:', filteredPDRs?.slice(0,1).map(p => ({ fy_label: p.fy_label, status: p.status })));
    console.log('GET PDRs: After transformation:', transformedPDRs?.slice(0,1).map(p => ({ fyLabel: p.fyLabel, status: p.status })));

    const response = createPaginatedResponse(transformedPDRs, total || 0, page, limit);
    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    console.log('PDR POST: Authenticating request...');
    const authResult = await authenticateRequest(request);
    console.log('PDR POST: Auth result:', authResult);
    if (!authResult.success) {
      console.log('PDR POST: Authentication failed');
      return authResult.response;
    }

    const { user } = authResult;
    console.log('PDR POST: Authenticated user:', user);

    // Only employees can create PDRs
    if (user.role !== 'EMPLOYEE') {
      return createApiError('Only employees can create PDRs', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const supabase = await createClient();

    // Parse request body to get the selected financial year
    console.log('PDR POST: Parsing request body...');
    const body = await request.json();
    console.log('PDR POST: Request body:', body);
    
    const { fyLabel: fy_label, fyStartDate: fy_start_date, fyEndDate: fy_end_date } = body;
    console.log('PDR POST: Extracted FY fields:', { fy_label, fy_start_date, fy_end_date });

    if (!fy_label || !fy_start_date || !fy_end_date) {
      console.log('PDR POST: Missing FY fields - returning 400');
      return createApiError('Missing required financial year fields', 400, 'MISSING_FY_DATA');
    }

    console.log('PDR POST: All FY fields present, proceeding...');

    // Check if user already has a PDR for this FY
    console.log('PDR POST: Checking for existing PDR...');
    const { data: existingPDR, error: checkError } = await supabase
      .from('pdrs')
      .select('id')
      .eq('user_id', user.id)
      .eq('fy_label', fy_label)
      .single();

    console.log('PDR POST: Existing PDR check result:', { existingPDR, checkError });

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.log('PDR POST: Existing PDR check failed:', checkError);
      throw checkError;
    }

    if (existingPDR) {
      console.log('PDR POST: PDR already exists, returning error');
      return createApiError(`PDR already exists for Financial Year ${fy_label}`, 400, 'PDR_EXISTS');
    }

    console.log('PDR POST: No existing PDR found, proceeding with creation...');

    // Create new PDR with FY fields from request
    const insertData = {
      user_id: user.id,
      fy_label: fy_label,
      fy_start_date: new Date(fy_start_date).toISOString().split('T')[0], // Convert ISO string to YYYY-MM-DD
      fy_end_date: new Date(fy_end_date).toISOString().split('T')[0], // Convert ISO string to YYYY-MM-DD
      status: 'Created' as const,
      current_step: 1,
      is_locked: false,
      meeting_booked: false,
    };
    console.log('Inserting PDR data:', insertData);
    
    console.log('PDR POST: Attempting database insert...');
    const { data: pdr, error: createError } = await supabase
      .from('pdrs')
      .insert(insertData)
      .select(`
        *,
        user:profiles!pdrs_user_id_fkey(id, first_name, last_name, email, role),
        period:pdr_periods(*)
      `)
      .single();

    console.log('PDR POST: Database insert result:', { pdr: pdr?.id || 'null', createError });

    if (createError) {
      console.error('PDR creation error:', createError);
      console.error('Error details:', JSON.stringify(createError, null, 2));
      throw createError;
    }

    console.log('PDR POST: Successfully created PDR:', pdr?.id);
    
    // Transform PDR fields to camelCase
    const transformedPDR = transformPDRFields(pdr);
    
    return createApiResponse(transformedPDR, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
