/**
 * Supabase Query Service
 * Uses Supabase query builder for safe, efficient database access
 * Aligned with actual database schema
 */

import { supabase } from '../supabaseClient.js';

export class SupabaseQueryService {
  constructor() {
    this.maxResults = 50;
  }

  /**
   * Main entry point - processes natural language questions using query builder
   */
  async processQuestion(userQuestion) {

    try {
      // Analyze intent and extract entities
      const analysis = this.analyzeIntent(userQuestion);

      // Execute appropriate queries based on intent
      const results = await this.executeQueries(analysis);

      // Format response
      const response = this.formatResponse(userQuestion, results, analysis);
      
      return response;

    } catch (error) {
      console.error('Database query failed:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  analyzeIntent(userQuestion) {
    const question = userQuestion.toLowerCase();
    
    // Extract entities and intent with much more sophistication
    const analysis = {
      intent: 'general',
      entities: {
        condition: null,
        product: null,
        procedure: null,
        category: null,
        severity: null,
        phase: null,
        patientType: null,
        recommendationType: null
      },
      searchTerms: [],
      isRecommendationRequest: false,
      specificity: 'general' // general, specific, highly_specific
    };

    // Detect specific availability queries FIRST (highest priority)
    if ((question.includes('not available') || question.includes('unavailable') || 
         question.includes('out of stock') || question.includes('discontinued')) &&
        (question.includes('product') || question.includes('products'))) {
      analysis.intent = 'find_unavailable_products';
      analysis.entities.availabilityStatus = 'unavailable';
    } else if ((question.includes('available') || question.includes('in stock')) && 
               (question.includes('product') || question.includes('products')) &&
               !question.includes('not') && !question.includes('un')) {
      analysis.intent = 'find_available_products';
      analysis.entities.availabilityStatus = 'available';
    }
    // Detect recommendation intent (more specific than just finding products)
    else if (question.includes('recommend') || question.includes('should i') || question.includes('best for') || 
        question.includes('suggest') || question.includes('what to use')) {
      analysis.isRecommendationRequest = true;
      analysis.intent = 'recommend_products';
    } else if (question.includes('product') || question.includes('products')) {
      analysis.intent = 'find_products';
    } else if (question.includes('research') || question.includes('study') || question.includes('article')) {
      analysis.intent = 'find_research';
    } else if (question.includes('procedure') || question.includes('treatment') || question.includes('therapy')) {
      analysis.intent = 'find_procedures';
    } else if (question.includes('categor')) {
      analysis.intent = 'list_categories';
    } else if (question.includes('evidence') || question.includes('clinical')) {
      analysis.intent = 'find_evidence';
    }

    // Extract severity levels
    const severityIndicators = {
      'mild': ['mild', 'light', 'early', 'initial', 'beginning'],
      'moderate': ['moderate', 'medium', 'intermediate'],
      'severe': ['severe', 'advanced', 'aggressive', 'acute', 'serious'],
      'chronic': ['chronic', 'persistent', 'long-term', 'ongoing']
    };

    for (const [severity, indicators] of Object.entries(severityIndicators)) {
      if (indicators.some(indicator => question.includes(indicator))) {
        analysis.entities.severity = severity;
        analysis.specificity = 'specific';
        break;
      }
    }

    // Extract treatment phases
    const phaseIndicators = {
      'pre-operative': ['pre-operative', 'preoperative', 'before surgery', 'pre-op', 'preparation'],
      'operative': ['operative', 'during surgery', 'surgical', 'operation'],
      'post-operative': ['post-operative', 'postoperative', 'after surgery', 'post-op', 'recovery'],
      'maintenance': ['maintenance', 'ongoing', 'long-term', 'follow-up'],
      'initial': ['initial', 'first', 'starting', 'beginning'],
      'emergency': ['emergency', 'urgent', 'immediate', 'acute care']
    };

    for (const [phase, indicators] of Object.entries(phaseIndicators)) {
      if (indicators.some(indicator => question.includes(indicator))) {
        analysis.entities.phase = phase;
        analysis.specificity = 'specific';
        break;
      }
    }

    // Extract patient type information
    const patientTypeIndicators = {
      'pediatric': ['child', 'children', 'pediatric', 'kid', 'young'],
      'adult': ['adult', 'grown-up'],
      'geriatric': ['elderly', 'senior', 'geriatric', 'old'],
      'pregnant': ['pregnant', 'pregnancy', 'expecting'],
      'diabetic': ['diabetic', 'diabetes'],
      'immunocompromised': ['immunocompromised', 'immune system', 'cancer patient']
    };

    // Look for specific patient type numbers (e.g., "patient type 4")
    const patientTypeMatch = question.match(/patient\s+type\s+(\d+)/);
    if (patientTypeMatch) {
      analysis.entities.patientType = `type_${patientTypeMatch[1]}`;
      analysis.specificity = 'highly_specific';
    } else {
      for (const [type, indicators] of Object.entries(patientTypeIndicators)) {
        if (indicators.some(indicator => question.includes(indicator))) {
          analysis.entities.patientType = type;
          analysis.specificity = 'specific';
          break;
        }
      }
    }

    // First, try to identify multi-word medical conditions before breaking into individual words
    const medicalPhrases = this.extractMedicalPhrases(question);
    
    // Extract ALL meaningful terms dynamically from the question
    // Clean punctuation properly (following research recommendations)
    const cleanedQuestion = question
      .replace(/[?!.]/g, ' ')  // Replace punctuation with spaces
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim()
      .toLowerCase();
    
    const words = cleanedQuestion.split(/[\s,.-]+/).map(w => w.trim()).filter(w => w.length > 2);
    
    // Define comprehensive stop words to filter out
    const stopWords = new Set([
      'what', 'are', 'is', 'the', 'for', 'of', 'to', 'in', 'on', 'at', 'by', 'with', 'from', 'and', 'or', 'but',
      'products', 'product', 'recommend', 'recommended', 'should', 'would', 'could', 'can', 'will', 'best', 
      'used', 'use', 'treatment', 'treatments', 'patient', 'patients', 'type', 'types', 'phase', 'phases',
      'how', 'when', 'where', 'why', 'who', 'which', 'that', 'this', 'these', 'those', 'have', 'has', 'had',
      'do', 'does', 'did', 'be', 'been', 'being', 'was', 'were', 'am', 'is', 'are', 'get', 'got', 'give',
      'someone', 'something', 'anything', 'everything', 'nothing', 'anyone', 'everyone', 'want', 'need'
    ]);

    // Extract meaningful search terms
    const meaningfulTerms = words.filter(word => {
      // Skip stop words
      if (stopWords.has(word)) return false;
      
      // Skip very short words unless they're known medical abbreviations
      if (word.length < 3) return false;
      
      // Include words that look medical/dental (contain common suffixes/prefixes)
      const medicalPatterns = /^(anti|pre|post|sub|hyper|hypo|inter|intra|extra|peri|endo|exo|micro|macro|multi|re)|\w*(itis|osis|oma|emia|uria|ectomy|otomy|plasty|scopy|graphy|therapy|genic|pathic|static|lytic)$/i;
      if (medicalPatterns.test(word)) return true;
      
      // Include longer meaningful words
      return word.length >= 4;
    });

    // Prioritize medical phrases over individual terms
    if (medicalPhrases.length > 0) {
      analysis.searchTerms.push(...medicalPhrases);
      analysis.searchTerms.push(...meaningfulTerms);
      analysis.entities.condition = medicalPhrases[0]; // Use the first medical phrase as primary condition
    } else {
      analysis.searchTerms.push(...meaningfulTerms);
      // Identify the primary condition/entity (usually the first meaningful medical term)
      const primaryCondition = meaningfulTerms.find(term => {
        return term.length > 4 && !['severe', 'mild', 'moderate', 'chronic', 'acute'].includes(term);
      });
      if (primaryCondition) {
        analysis.entities.condition = primaryCondition;
      }
    }


    // Determine specificity level
    if (analysis.entities.severity && analysis.entities.patientType) {
      analysis.specificity = 'highly_specific';
    } else if (analysis.entities.severity || analysis.entities.phase || analysis.entities.patientType) {
      analysis.specificity = 'specific';
    }

    // Add general search terms (only if we don't have good medical phrases)
    if (analysis.searchTerms.length < 2) {
      const additionalWords = question.split(' ').filter(w => w.length > 3 && 
        !['what', 'products', 'used', 'treatment', 'show', 'find', 'about', 'should', 'recommend'].includes(w));
      analysis.searchTerms.push(...additionalWords);
    }

    // Remove duplicates and filter out noise words and punctuation
    analysis.searchTerms = [...new Set(analysis.searchTerms)]
      .filter(term => !['recommended', 'products', 'should', 'what'].includes(term.toLowerCase()))
      .map(term => term.replace(/[?!.,;:]$/, '')) // Remove trailing punctuation
      .filter(term => term.length > 0);

    return analysis;
  }

  getAvailabilityStatus(product) {
    if (product.is_available && (product.stock_quantity > 0 || product.stock_quantity === undefined)) {
      return { status: 'available', message: 'In stock' };
    } else if (product.expected_restock_date) {
      return { 
        status: 'backordered', 
        message: `Available ${product.expected_restock_date}` 
      };
    } else if (!product.is_available) {
      return { 
        status: 'discontinued', 
        message: 'Limited availability - contact supplier' 
      };
    }
    return { status: 'unknown', message: 'Contact supplier' };
  }

  prioritizeProductsByEvidence(products, analysis) {
    const condition = analysis.entities.condition?.toLowerCase() || '';
    
    // Evidence-based scoring for specific conditions
    const evidenceScores = {
      'lichen planus': {
        'synvaza': 100,  // Highest evidence - specific clinical trial for OLP
        'ao provantage gel': 95,  // Strong evidence - RCT for OLP  
        'perioprotect': 70,  // General antimicrobial, not specific to OLP
      },
      'gingivitis': {
        'perioprotect': 100,
        'ao provantage gel': 90,
        'moisyn': 85,
        'synvaza': 60
      },
      'periodontitis': {
        'perioprotect': 100,
        'ao provantage gel': 85,
        'moisyn': 80,
        'synvaza': 50
      }
    };

    return products.map(product => {
      const productName = product.name?.toLowerCase() || '';
      let evidenceScore = 50; // Default score
      
      // Find matching condition and product
      for (const [conditionKey, productScores] of Object.entries(evidenceScores)) {
        if (condition.includes(conditionKey)) {
          for (const [productKey, score] of Object.entries(productScores)) {
            if (productName.includes(productKey)) {
              evidenceScore = score;
              break;
            }
          }
          break;
        }
      }
      
      // Boost score for research/evidence matches
      if (product.match_reason?.includes('research')) {
        evidenceScore += 20;
      }
      if (product.match_reason?.includes('details')) {
        evidenceScore += 15;
      }
      
      return {
        ...product,
        evidence_score: evidenceScore
      };
    }).sort((a, b) => b.evidence_score - a.evidence_score);
  }

  extractMedicalPhrases(question) {
    const medicalPhrases = [];
    // Clean punctuation first (following research recommendations)
    const cleanedQuestion = question
      .replace(/[?!.]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    
    // Common multi-word dental/medical conditions
    const knownPhrases = [
      'lichen planus', 'oral lichen planus',
      'periodontal disease', 'gum disease', 'advanced periodontal disease',
      'dry mouth', 'dry socket',
      'tooth decay', 'root canal', 'root caries',
      'dental implant', 'dental implants',
      'oral cancer', 'oral surgery',
      'gingivitis treatment', 'periodontitis treatment',
      'scaling and root planing',
      'bone loss', 'bone graft', 'bone grafting',
      'sinus lift', 'sinus augmentation',
      'crown lengthening',
      'soft tissue graft', 'gum graft',
      'pocket reduction',
      'maintenance therapy',
      'oral hygiene',
      'plaque control',
      'bacterial infection',
      'antimicrobial therapy'
    ];

    // Look for exact phrase matches
    for (const phrase of knownPhrases) {
      if (cleanedQuestion.includes(phrase)) {
        medicalPhrases.push(phrase);
      }
    }

    // Also look for pattern-based multi-word conditions (adjective + medical term)
    const medicalTermPattern = /\b(severe|mild|moderate|chronic|acute|advanced|early|initial)\s+([a-z]+(?:itis|osis|oma|emia|uria|pathy|trophy|plasia))\b/gi;
    let match;
    while ((match = medicalTermPattern.exec(cleanedQuestion)) !== null) {
      medicalPhrases.push(match[0]);
    }

    return [...new Set(medicalPhrases)]; // Remove duplicates
  }

  async findProductsByAvailability(isAvailable) {
    try {
      
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          manufacturer,
          is_available,
          expected_restock_date,
          stock_quantity
        `)
        .eq('is_available', isAvailable)
        .order('name');

      if (error) {
        console.error('Availability query error:', error);
        return [];
      }

      return (products || []).map(product => ({
        ...product,
        availability_status: this.getAvailabilityStatus(product),
        match_reason: `Product availability: ${isAvailable ? 'Available' : 'Not available'}`
      }));

    } catch (error) {
      console.error('Error finding products by availability:', error);
      return [];
    }
  }

  async executeQueries(analysis) {
    const results = {};

    switch (analysis.intent) {
      case 'find_unavailable_products':
        results.products = await this.findProductsByAvailability(false);
        break;
      case 'find_available_products':
        results.products = await this.findProductsByAvailability(true);
        break;
      case 'recommend_products':
        // Highly targeted product recommendations
        results.recommendations = await this.getProductRecommendations(analysis);
        results.products = await this.findProducts(analysis);
        results.evidence = await this.findEvidence(analysis);
        break;
      case 'find_products':
        results.products = await this.findProducts(analysis);
        if (analysis.specificity !== 'general') {
          results.evidence = await this.findEvidence(analysis);
        }
        break;
      case 'find_research':
        results.research = await this.findResearch(analysis);
        break;
      case 'find_procedures':
        results.procedures = await this.findProcedures(analysis);
        break;
      case 'list_categories':
        results.categories = await this.listCategories();
        break;
      case 'find_evidence':
        results.evidence = await this.findEvidence(analysis);
        break;
      default:
        // General search - try multiple approaches
        results.products = await this.findProducts(analysis);
        results.procedures = await this.findProcedures(analysis);
        results.research = await this.findResearch(analysis);
    }

    return results;
  }

  async getProductRecommendations(analysis) {
    try {

      // Start with phase-specific product usage if we have phase/severity info
      if (analysis.entities.phase || analysis.entities.severity || analysis.entities.patientType) {
        return await this.getSpecificRecommendations(analysis);
      }

      // Fall back to general product search
      return await this.findProducts(analysis);

    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  async getSpecificRecommendations(analysis) {
    try {
      let phaseSpecificProducts = [];
      
      // First, try to find any products that match the condition/terms dynamically
      const conditionProducts = await this.findProductsForConditionDynamic(analysis);
      phaseSpecificProducts.push(...conditionProducts);

      // Look for phase-specific product usage
      if (analysis.entities.phase) {
        const { data: phaseUsage, error: phaseError } = await supabase
          .from('phase_specific_usage')
          .select(`
            instructions,
            products (
              id,
              name,
              product_details (
                clinical_evidence,
                scientific_rationale
              )
            ),
            procedures (
              name
            ),
            phases (
              name
            )
          `)
          .eq('phases.name', analysis.entities.phase)
          .limit(20);

        if (!phaseError && phaseUsage) {
          const phaseProducts = phaseUsage.map(usage => ({
            ...usage.products,
            phase_instructions: usage.instructions,
            procedure_name: usage.procedures?.name,
            phase_name: usage.phases?.name,
            recommendation_reason: `Specifically recommended for ${usage.phases?.name} phase`
          }));
          phaseSpecificProducts.push(...phaseProducts);
        }
      }

      // Filter by patient type if specified
      if (analysis.entities.patientType && analysis.entities.patientType.startsWith('type_')) {
        const patientTypeId = analysis.entities.patientType.replace('type_', '');
        
        const { data: patientSpecific, error: patientError } = await supabase
          .from('procedure_phase_products')
          .select(`
            products (
              id,
              name,
              product_details (
                clinical_evidence,
                scientific_rationale
              )
            ),
            procedures (
              name
            ),
            patient_types (
              name,
              description
            )
          `)
          .eq('patient_type_id', patientTypeId)
          .limit(20);

        if (!patientError && patientSpecific) {
          const patientProducts = patientSpecific.map(item => ({
            ...item.products,
            procedure_name: item.procedures?.name,
            patient_type: item.patient_types?.name,
            recommendation_reason: `Specifically for ${item.patient_types?.name || `patient type ${patientTypeId}`}`
          }));

          phaseSpecificProducts.push(...patientProducts);
        }
      }

      // If we still don't have many results, do a broader search
      if (phaseSpecificProducts.length < 2) {
        const generalProducts = await this.findProducts(analysis);
        phaseSpecificProducts.push(...generalProducts);
      }
      
      // Deduplicate, keeping specific recommendations first
      const uniqueRecommendations = phaseSpecificProducts.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );

      return uniqueRecommendations;

    } catch (error) {
      console.error('Error getting specific recommendations:', error);
      return [];
    }
  }

  async findProductsForConditionDynamic(analysis) {
    try {
      if (!analysis.searchTerms.length) return [];

      const searchTerm = analysis.searchTerms[0];
      
      // Use simple query without complex OR conditions to avoid errors
      const { data: results, error } = await supabase
        .from('procedure_phase_products')
        .select(`
          products (
            id,
            name,
            is_available,
            product_details (
              clinical_evidence,
              scientific_rationale,
              procedure_name
            )
          ),
          procedures (
            name,
            pitch_points,
            categories (
              name
            )
          )
        `)
        .limit(50);

      if (error) {
        console.error('Dynamic condition search error:', error);
        return [];
      }

      // Filter results on the client side
      const filteredResults = (results || []).filter(result => {
        if (!result.procedures) return false;
        
        const procedureName = result.procedures.name?.toLowerCase() || '';
        const pitchPoints = result.procedures.pitch_points?.toLowerCase() || '';
        const categoryName = result.procedures.categories?.name?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();
        
        return procedureName.includes(term) || 
               pitchPoints.includes(term) || 
               categoryName.includes(term);
      });

      return filteredResults
        .filter(result => result.products)
        .map(result => ({
          ...result.products,
          procedure_name: result.procedures?.name,
          category_name: result.procedures?.categories?.name,
          recommendation_reason: `Found for ${searchTerm} condition`
        }));

    } catch (error) {
      console.error('Error in dynamic condition search:', error);
      return [];
    }
  }

  async findProductsThroughDetails(analysis) {
    try {
      if (!analysis.searchTerms.length) return [];


      const primaryTerm = analysis.entities.condition || analysis.searchTerms[0];

      // Use comprehensive search across multiple fields
      const [evidenceResults, rationaleResults, rationaleResults2] = await Promise.all([
        // Search clinical evidence
        supabase
          .from('product_details')
          .select(`
            product_id,
            clinical_evidence,
            scientific_rationale,
            objection_handling,
            procedure_name,
            product_name,
            products (
              id,
              name,
              is_available
            )
          `)
          .ilike('clinical_evidence', `%${primaryTerm}%`)
          .limit(this.maxResults),

        // Search scientific rationale
        supabase
          .from('product_details')
          .select(`
            product_id,
            clinical_evidence,
            scientific_rationale,
            objection_handling,
            procedure_name,
            product_name,
            products (
              id,
              name,
              is_available
            )
          `)
          .ilike('scientific_rationale', `%${primaryTerm}%`)
          .limit(this.maxResults),

        // Search procedure name (since the data shows "Lichen Planus" might be in procedure_name)
        supabase
          .from('product_details')
          .select(`
            product_id,
            clinical_evidence,
            scientific_rationale,
            objection_handling,
            procedure_name,
            product_name,
            products (
              id,
              name,
              is_available
            )
          `)
          .ilike('procedure_name', `%${primaryTerm}%`)
          .limit(this.maxResults)
      ]);

      const allResults = [
        ...(evidenceResults.data || []),
        ...(rationaleResults.data || []),
        ...(rationaleResults2.data || [])
      ];


      return allResults
        .filter(result => result.products)
        .map(result => ({
          ...result.products,
          procedure_name: result.procedure_name,
          product_details: [{
            clinical_evidence: result.clinical_evidence,
            scientific_rationale: result.scientific_rationale,
            objection_handling: result.objection_handling
          }],
          match_reason: 'Found through product details/evidence'
        }))
        .filter((product, index, self) => 
          index === self.findIndex(p => p.id === product.id)
        ); // Remove duplicates

    } catch (error) {
      console.error('Error finding products through details:', error);
      return [];
    }
  }

  async findProducts(analysis) {
    try {

      let allProducts = [];

      // Search products directly by name using ALL search terms
      if (analysis.searchTerms.length > 0) {
        
                      // Use the primary search term only to avoid complex OR queries
        const primaryTerm = analysis.entities.condition || analysis.searchTerms[0];
        
        const { data: directProducts, error: directError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            is_available,
            product_details (
              clinical_evidence,
              objection_handling,
              scientific_rationale,
              procedure_name,
              product_name
            )
          `)
          .ilike('name', `%${primaryTerm}%`)
          .limit(this.maxResults);

                  if (!directError && directProducts) {
            const enhancedProducts = directProducts.map(product => ({
              ...product,
              match_reason: 'Direct product name match',
              availability_status: this.getAvailabilityStatus(product)
            }));
            allProducts.push(...enhancedProducts);
          }
      }

      // Also find products through procedures (dynamic search)
      const procedureProducts = await this.findProductsThroughProceduresDynamic(analysis);
      allProducts.push(...procedureProducts);

      // Find products through research articles
      const researchProducts = await this.findProductsThroughResearch(analysis);
      allProducts.push(...researchProducts);

      // Search in product details for comprehensive coverage
      const detailProducts = await this.findProductsThroughDetails(analysis);
      allProducts.push(...detailProducts);
      
      // Deduplicate
      const uniqueProducts = allProducts.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );

      // Prioritize products based on evidence strength for the specific condition
      const prioritizedProducts = this.prioritizeProductsByEvidence(uniqueProducts, analysis);
      return prioritizedProducts;

    } catch (error) {
      console.error('Error finding products:', error);
      return [];
    }
  }

  async findProductsThroughProcedures(analysis) {
    try {
      if (analysis.searchTerms.length === 0) return [];

      const searchTerm = analysis.searchTerms[0];
      
      // Find procedures matching the condition
      const { data: procedures, error: procError } = await supabase
        .from('procedures')
        .select('id, name')
        .or(`name.ilike.%${encodeURIComponent(searchTerm)}%,pitch_points.ilike.%${encodeURIComponent(searchTerm)}%`)
        .limit(20);

      if (procError || !procedures || procedures.length === 0) {
        return [];
      }

      const procedureIds = procedures.map(p => p.id);

      // Find products linked to these procedures
      const { data: productLinks, error: linkError } = await supabase
        .from('procedure_phase_products')
        .select(`
          products (
            id,
            name,
            product_details (
              clinical_evidence,
              procedure_name
            )
          ),
          procedures (
            name
          )
        `)
        .in('procedure_id', procedureIds)
        .limit(this.maxResults);

      if (linkError) {
        console.error('Product links query error:', linkError);
        return [];
      }

      // Flatten the results
      const linkedProducts = (productLinks || [])
        .filter(link => link.products)
        .map(link => ({
          ...link.products,
          procedure_name: link.procedures?.name,
          source: 'procedure_link'
        }));

      return linkedProducts;

    } catch (error) {
      console.error('Error finding products through procedures:', error);
      return [];
    }
  }

  async findProductsThroughProceduresDynamic(analysis) {
    try {
      if (!analysis.searchTerms.length) return [];


      // Use the primary search term without URL encoding (Supabase handles this)
      const primaryTerm = analysis.entities.condition || analysis.searchTerms[0];
      
      // Use simple query without nested filtering to avoid 400 errors
      const { data: procedureResults, error } = await supabase
        .from('procedure_phase_products')
        .select(`
          products (
            id,
            name,
            is_available,
            product_details (
              clinical_evidence,
              objection_handling,
              scientific_rationale,
              procedure_name,
              product_name
            )
          ),
          procedures (
            id,
            name,
            pitch_points,
            categories (
              name
            )
          )
        `)
        .limit(this.maxResults);

      if (error) {
        console.error('Dynamic procedure products query error:', error);
        return [];
      }

      // Filter results on the client side to avoid complex Supabase queries
      const allResults = (procedureResults || []).filter(result => {
        if (!result.procedures) return false;
        
        const procedureName = result.procedures.name?.toLowerCase() || '';
        const pitchPoints = result.procedures.pitch_points?.toLowerCase() || '';
        const categoryName = result.procedures.categories?.name?.toLowerCase() || '';
        const searchTerm = primaryTerm.toLowerCase();
        
        return procedureName.includes(searchTerm) || 
               pitchPoints.includes(searchTerm) || 
               categoryName.includes(searchTerm);
      });


      return allResults
        .filter(result => result.products)
        .map(result => ({
          ...result.products,
          procedure_name: result.procedures?.name,
          category_name: result.procedures?.categories?.name,
          match_reason: `Found through procedure: ${result.procedures?.name}`
        }))
        .filter((product, index, self) => 
          index === self.findIndex(p => p.id === product.id)
        ); // Remove duplicates

    } catch (error) {
      console.error('Error finding products through procedures dynamically:', error);
      return [];
    }
  }

  async findProductsThroughResearch(analysis) {
    try {
      if (!analysis.searchTerms.length) return [];


      // Use simpler search for primary condition
      const primaryTerm = analysis.entities.condition || analysis.searchTerms[0];

      const { data: researchResults, error } = await supabase
        .from('condition_product_research_articles')
        .select(`
          product_id,
          title,
          abstract,
          products (
            id,
            name,
            is_available,
            product_details (
              clinical_evidence,
              scientific_rationale
            )
          ),
          procedures (
            name
          )
        `)
        .or(`title.ilike.%${primaryTerm}%,abstract.ilike.%${primaryTerm}%`)
        .limit(this.maxResults);

      if (error) {
        console.error('Research products query error:', error);
        return [];
      }


      return (researchResults || [])
        .filter(result => result.products)
        .map(result => ({
          ...result.products,
          procedure_name: result.procedures?.name,
          research_title: result.title,
          research_abstract: result.abstract?.substring(0, 200) + '...',
          match_reason: `Found in research: ${result.title?.substring(0, 50)}...`
        }));

    } catch (error) {
      console.error('Error finding products through research:', error);
      return [];
    }
  }

  async findProcedures(analysis) {
    try {

      let query = supabase
        .from('procedures')
        .select(`
          id,
          name,
          pitch_points,
          category,
          patient_type,
          categories (
            name
          )
        `)
        .limit(this.maxResults);

      if (analysis.searchTerms.length > 0) {
        const searchTerm = analysis.searchTerms[0];
        query = query.or(`name.ilike.%${encodeURIComponent(searchTerm)}%,pitch_points.ilike.%${encodeURIComponent(searchTerm)}%,category.ilike.%${encodeURIComponent(searchTerm)}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Procedures query error:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error finding procedures:', error);
      return [];
    }
  }

  async findResearch(analysis) {
    try {

      // The actual table is condition_product_research_articles
      let query = supabase
        .from('condition_product_research_articles')
        .select(`
          id,
          title,
          author,
          abstract,
          url,
          procedures (
            name
          ),
          products (
            name
          )
        `)
        .limit(this.maxResults);

      if (analysis.searchTerms.length > 0) {
        const searchTerm = analysis.searchTerms[0];
        query = query.or(`title.ilike.%${encodeURIComponent(searchTerm)}%,abstract.ilike.%${encodeURIComponent(searchTerm)}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Research query error:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error finding research:', error);
      return [];
    }
  }

  async findEvidence(analysis) {
    try {

      let query = supabase
        .from('product_details')
        .select(`
          id,
          clinical_evidence,
          scientific_rationale,
          procedure_name,
          product_name,
          products (
            name
          )
        `)
        .not('clinical_evidence', 'is', null)
        .limit(this.maxResults);

      if (analysis.searchTerms.length > 0) {
        const searchTerm = analysis.searchTerms[0];
        query = query.or(`clinical_evidence.ilike.%${encodeURIComponent(searchTerm)}%,scientific_rationale.ilike.%${encodeURIComponent(searchTerm)}%,procedure_name.ilike.%${encodeURIComponent(searchTerm)}%,product_name.ilike.%${encodeURIComponent(searchTerm)}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Evidence query error:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error finding evidence:', error);
      return [];
    }
  }

  async listCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          id,
          name
        `)
        .limit(20);

      if (error) {
        console.error('Categories query error:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error listing categories:', error);
      return [];
    }
  }

  formatResponse(originalQuestion, queryResults, analysis) {
    const allData = [];
    let answer = "";
    let totalResults = 0;

    // Combine all results
    Object.entries(queryResults).forEach(([category, results]) => {
      if (results && results.length > 0) {
        allData.push(...results.map(item => ({ ...item, source: category })));
        totalResults += results.length;
      }
    });

    if (totalResults === 0) {
      return {
        answer: "I couldn't find specific information in the database for your question. This might be because:\n• The specific procedures or products aren't in our current dataset\n• The terminology doesn't match exactly\n• Try using different keywords or asking a more general question",
        data: [],
        confidence: 0.3,
        suggestions: this.generateSuggestions(analysis)
      };
    }

    // Format answer based on intent
    switch (analysis.intent) {
      case 'find_unavailable_products':
        answer = this.formatAvailabilityAnswer(queryResults.products || [], false);
        break;
      case 'find_available_products':
        answer = this.formatAvailabilityAnswer(queryResults.products || [], true);
        break;
      case 'recommend_products':
        answer = this.formatRecommendationsAnswer(queryResults.recommendations || [], analysis, queryResults.evidence || []);
        break;
      case 'find_products':
        answer = this.formatProductsAnswer(queryResults.products || [], analysis);
        break;
      case 'find_research':
        answer = this.formatResearchAnswer(queryResults.research || [], analysis);
        break;
      case 'find_procedures':
        answer = this.formatProceduresAnswer(queryResults.procedures || [], analysis);
        break;
      case 'find_evidence':
        answer = this.formatEvidenceAnswer(queryResults.evidence || [], analysis);
        break;
      case 'list_categories':
        answer = this.formatCategoriesAnswer(queryResults.categories || []);
        break;
      default:
        answer = this.formatGeneralAnswer(allData, totalResults);
    }

    return {
      answer,
      data: allData,
      confidence: Math.min(0.9, 0.5 + (totalResults * 0.1)),
      suggestions: this.generateSuggestions(analysis),
      resultCount: totalResults
    };
  }

  formatRecommendationsAnswer(recommendations, analysis, evidence) {
    if (!recommendations || recommendations.length === 0) {
      return this.formatNoResultsRecommendation(analysis);
    }

    // For specific recommendations, use a simple, direct format
    if (analysis.specificity === 'highly_specific' || analysis.isRecommendationRequest) {
      return this.formatSimpleRecommendation(recommendations, analysis);
    }

    // For general product searches, use the more detailed format
    let answer = this.formatRecommendationHeader(analysis);
    
    recommendations.slice(0, 3).forEach((product, index) => {
      answer += `**${product.name}**\n`;
      
      // Add clinical evidence briefly
      if (product.product_details && product.product_details.length > 0) {
        const details = product.product_details[0];
        if (details.clinical_evidence) {
          answer += `• ${details.clinical_evidence.substring(0, 100)}...\n`;
        }
      }
      
      answer += '\n';
    });

    return answer;
  }

  formatAvailabilityAnswer(products, isAvailable) {
    if (products.length === 0) {
      return `No ${isAvailable ? 'available' : 'unavailable'} products found in the database.`;
    }

    const statusText = isAvailable ? 'available' : 'not available';
    let answer = `I found ${products.length} product(s) that are currently ${statusText}:\n\n`;

    products.forEach(product => {
      answer += `**${product.name}**`;
      
      if (product.manufacturer) {
        answer += ` (${product.manufacturer})`;
      }
      
      if (!isAvailable) {
        if (product.expected_restock_date) {
          answer += ` - Expected back: ${product.expected_restock_date}`;
        } else {
          answer += ` - Contact supplier for availability`;
        }
      } else {
        if (product.stock_quantity && product.stock_quantity > 0) {
          answer += ` - ${product.stock_quantity} in stock`;
        } else {
          answer += ` - In stock`;
        }
      }
      
      answer += '\n';
    });

    return answer.trim();
  }

  formatSimpleRecommendation(recommendations, analysis) {
    const topProducts = recommendations.slice(0, 3);
    
    if (topProducts.length === 0) {
      return `I couldn't find specific recommendations for ${this.formatConditionContext(analysis)}. Try searching for broader terms or check if the condition exists in our database.`;
    }

    let answer = `For ${this.formatConditionContext(analysis)}, I would recommend `;
    
    if (topProducts.length === 1) {
      answer += `**${topProducts[0].name}**.`;
    } else if (topProducts.length === 2) {
      answer += `**${topProducts[0].name}** or **${topProducts[1].name}**.`;
    } else {
      answer += `**${topProducts[0].name}**, **${topProducts[1].name}**, or **${topProducts[2].name}**.`;
    }

    // Add availability information for unavailable products
    const unavailableProducts = topProducts.filter(p => 
      p.availability_status?.status === 'discontinued' || !p.is_available
    );
    
    if (unavailableProducts.length > 0) {
      const unavailableNames = unavailableProducts.map(p => p.name).join(', ');
      answer += `\n\n*Note: ${unavailableNames} may have limited availability.*`;
    }

    return answer;
  }

  formatConditionContext(analysis) {
    let context = "";
    
    if (analysis.entities.severity && analysis.entities.condition) {
      // Check if condition already contains the severity
      if (analysis.entities.condition.includes(analysis.entities.severity)) {
        context += analysis.entities.condition;
      } else {
        context += `${analysis.entities.severity} ${analysis.entities.condition}`;
      }
    } else if (analysis.entities.condition) {
      context += analysis.entities.condition;
    } else if (analysis.searchTerms.length > 0) {
      // Fallback to the first search term if no condition identified
      context += analysis.searchTerms[0];
    } else {
      context += "this condition";
    }

    if (analysis.entities.patientType) {
      if (analysis.entities.patientType.startsWith('type_')) {
        const typeNumber = analysis.entities.patientType.replace('type_', '');
        context += ` in patient type ${typeNumber}`;
      } else {
        context += ` in ${analysis.entities.patientType} patients`;
      }
    }

    if (analysis.entities.phase && analysis.entities.phase !== 'general') {
      context += ` during ${analysis.entities.phase} phase`;
    }

    return context;
  }

  formatRecommendationHeader(analysis) {
    if (analysis.entities.condition) {
      return `**Products for ${analysis.entities.condition}:**\n\n`;
    }
    return `**Product recommendations:**\n\n`;
  }

  formatRecommendationAdvice(analysis) {
    // Removed - keeping responses simple and direct
    return "";
  }

  formatNoResultsRecommendation(analysis) {
    let message = "I couldn't find specific product recommendations for your exact criteria.\n\n";
    
    message += "**Suggestions:**\n";
    message += "• Try a more general question about the condition\n";
    message += "• Ask about the overall treatment approach\n";
    message += "• Inquire about different phases of treatment\n";
    
    if (analysis.entities.patientType && analysis.entities.patientType.startsWith('type_')) {
      message += `• Patient type ${analysis.entities.patientType.replace('type_', '')} may not have specific products in our database\n`;
    }

    return message;
  }

  formatProductsAnswer(products, analysis) {
    if (!products || products.length === 0) {
      return `No products found for ${analysis.entities.condition || 'your search'}.`;
    }

    const condition = analysis.entities.condition || 'your condition';
    let answer = `I found ${products.length} product(s) for ${condition}:\n\n`;
    
    products.slice(0, 5).forEach(product => {
      answer += `**${product.name}**\n`;
      
      if (product.product_details && product.product_details.length > 0) {
        const details = product.product_details[0];
        if (details.clinical_evidence) {
          answer += `• Clinical evidence: ${details.clinical_evidence.substring(0, 150)}...\n`;
        }
        if (details.procedure_name) {
          answer += `• Used in: ${details.procedure_name}\n`;
        }
      }
      
      if (product.procedure_name) {
        answer += `• Related procedure: ${product.procedure_name}\n`;
      }
      
      answer += '\n';
    });

    if (products.length > 5) {
      answer += `\n*Showing 5 of ${products.length} products. Ask for more specific information to see additional results.*`;
    }

    return answer;
  }

  formatProceduresAnswer(procedures, analysis) {
    if (!procedures || procedures.length === 0) {
      return `No procedures found for ${analysis.entities.condition || 'your search'}.`;
    }

    let answer = `I found ${procedures.length} procedure(s):\n\n`;
    
    procedures.slice(0, 5).forEach(procedure => {
      answer += `**${procedure.name}**`;
      if (procedure.categories?.name) {
        answer += ` (${procedure.categories.name})`;
      }
      answer += '\n';
      
      if (procedure.pitch_points) {
        answer += `• ${procedure.pitch_points.substring(0, 150)}...\n`;
      }
      
      if (procedure.patient_type) {
        answer += `• Patient type: ${procedure.patient_type}\n`;
      }
      
      answer += '\n';
    });

    return answer;
  }

  formatResearchAnswer(research, analysis) {
    if (!research || research.length === 0) {
      return `No research articles found for ${analysis.entities.condition || 'your search'}.`;
    }

    let answer = `I found ${research.length} research article(s):\n\n`;
    
    research.slice(0, 3).forEach(article => {
      answer += `**${article.title}**\n`;
      if (article.author) answer += `Author: ${article.author}\n`;
      if (article.abstract) answer += `Abstract: ${article.abstract.substring(0, 200)}...\n`;
      if (article.procedures?.name) answer += `Related procedure: ${article.procedures.name}\n`;
      if (article.products?.name) answer += `Related product: ${article.products.name}\n`;
      if (article.url) answer += `URL: ${article.url}\n`;
      answer += '\n';
    });

    return answer;
  }

  formatEvidenceAnswer(evidence, analysis) {
    if (!evidence || evidence.length === 0) {
      return `No clinical evidence found for ${analysis.entities.condition || 'your search'}.`;
    }

    let answer = `I found ${evidence.length} clinical evidence record(s):\n\n`;
    
    evidence.slice(0, 5).forEach(item => {
      const productName = item.products?.name || item.product_name;
      if (productName) {
        answer += `**${productName}**\n`;
      }
      
      if (item.clinical_evidence) {
        answer += `Clinical Evidence: ${item.clinical_evidence.substring(0, 200)}...\n`;
      }
      
      if (item.scientific_rationale) {
        answer += `Scientific Rationale: ${item.scientific_rationale.substring(0, 150)}...\n`;
      }
      
      if (item.procedure_name) {
        answer += `Used in: ${item.procedure_name}\n`;
      }
      
      answer += '\n';
    });

    return answer;
  }

  formatCategoriesAnswer(categories) {
    if (!categories || categories.length === 0) {
      return "No procedure categories found.";
    }

    let answer = `I found ${categories.length} procedure categories:\n\n`;
    
    categories.forEach(category => {
      answer += `• **${category.name}**\n`;
    });

    return answer;
  }

  formatGeneralAnswer(allData, totalResults) {
    return `I found ${totalResults} relevant result(s) in the database. The results include procedures, products, and clinical evidence related to your question.`;
  }

  generateSuggestions(analysis) {
    const suggestions = [];
    
    if (analysis.isRecommendationRequest && analysis.entities.condition) {
      // Context-specific suggestions for recommendations
      if (analysis.entities.severity !== 'severe') {
        suggestions.push(`What products are recommended for severe ${analysis.entities.condition}?`);
      }
      if (!analysis.entities.phase) {
        suggestions.push(`What products should I use for post-operative ${analysis.entities.condition} care?`);
      }
      if (!analysis.entities.patientType) {
        suggestions.push(`What products are best for pediatric ${analysis.entities.condition} patients?`);
      }
    } else if (analysis.entities.condition) {
      suggestions.push(`What research supports ${analysis.entities.condition} treatment?`);
      suggestions.push(`What clinical evidence is available for ${analysis.entities.condition}?`);
      suggestions.push(`What are the treatment phases for ${analysis.entities.condition}?`);
    }
    
    // General suggestions if we don't have specific context
    if (suggestions.length === 0) {
      suggestions.push("What are the main procedure categories?");
      suggestions.push("Show me products with clinical evidence");
      suggestions.push("What procedures are used for severe periodontal disease?");
    }
    
    return suggestions.slice(0, 3);
  }
}

export default SupabaseQueryService; 