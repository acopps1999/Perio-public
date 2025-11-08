/**
 * Condition Query Hooks
 *
 * React Query hooks for managing conditions (procedures) data with optimistic updates.
 *
 * This module provides:
 * - Query hooks for fetching conditions data
 * - Mutation hooks for updating conditions with optimistic UI updates
 * - Automatic cache invalidation and refresh
 * - Error handling and rollback on failures
 *
 * Usage:
 * ```javascript
 * const { data: conditions, isLoading } = useConditions();
 * const { data: condition } = useCondition(conditionId);
 * const updateField = useUpdateConditionField();
 * updateField.mutate({ conditionId: 123, field: 'name', value: 'New Name' });
 * ```
 *
 * @module hooks/useConditions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadProcedures, loadProcedureById, refreshProceduresView } from '../services/database/queries/procedures';
import {
  updateConditionFieldRealtime,
  addPhaseToConditionRealtime,
  removePhaseFromConditionRealtime,
  addProductToPatientTypeRealtime,
  removeProductFromPatientTypeRealtime,
  updateProductDetailRealtime,
  addCategoryRealtime,
  deleteCategoryRealtime,
  addDdsTypeRealtime,
  deleteDdsTypeRealtime,
  addProductRealtime,
  renameProductRealtime,
  deleteProductRealtime,
  addConditionToSupabase,
  updateConditionInSupabase,
  deleteConditionFromSupabase,
  getEntityIdMaps,
  invalidateConditionsCache
} from '../components/AdminPanel/AdminPanelSupabase';

// ============================================================================
// QUERY KEY FACTORY
// ============================================================================
// Centralized query key management for conditions
// This ensures consistent cache keys across all hooks

/**
 * Query key factory for conditions
 *
 * Provides hierarchical query keys for React Query cache management:
 * - all: ['conditions'] - Base key for all condition queries
 * - lists(): ['conditions', 'list'] - All condition lists
 * - list(filters): ['conditions', 'list', filters] - Filtered condition list
 * - details(): ['conditions', 'detail'] - All condition details
 * - detail(id): ['conditions', 'detail', id] - Single condition detail
 *
 * @constant
 */
export const conditionKeys = {
  all: ['conditions'],
  lists: () => [...conditionKeys.all, 'list'],
  list: (filters) => [...conditionKeys.lists(), filters],
  details: () => [...conditionKeys.all, 'detail'],
  detail: (id) => [...conditionKeys.details(), id],
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch all conditions with caching
 *
 * Fetches the complete list of conditions from the database with all related data.
 * Results are cached for 5 minutes to reduce database load.
 *
 * @returns {UseQueryResult} React Query result with conditions data
 * @property {Array} data - Array of condition objects
 * @property {boolean} isLoading - True while fetching data
 * @property {boolean} isError - True if query failed
 * @property {Error} error - Error object if query failed
 *
 * @example
 * const { data: conditions, isLoading, error } = useConditions();
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 *
 * return conditions.map(condition => (
 *   <div key={condition.db_id}>{condition.name}</div>
 * ));
 */
export const useConditions = () => {
  return useQuery({
    queryKey: conditionKeys.lists(),
    queryFn: loadProcedures,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch a single condition by ID
 *
 * Fetches a specific condition with all related data. Only executes if conditionId
 * is provided (enabled: !!conditionId).
 *
 * @param {number|string} conditionId - The database ID of the condition to fetch
 * @returns {UseQueryResult} React Query result with condition data
 * @property {Object} data - Condition object
 * @property {boolean} isLoading - True while fetching data
 * @property {boolean} isError - True if query failed
 * @property {Error} error - Error object if query failed
 *
 * @example
 * const conditionId = 123;
 * const { data: condition } = useCondition(conditionId);
 *
 * if (!condition) return null;
 *
 * return (
 *   <div>
 *     <h1>{condition.name}</h1>
 *     <p>{condition.pitchPoints}</p>
 *   </div>
 * );
 */
export const useCondition = (conditionId) => {
  return useQuery({
    queryKey: conditionKeys.detail(conditionId),
    queryFn: () => loadProcedureById(conditionId),
    enabled: !!conditionId,
  });
};

// ============================================================================
// MUTATION HOOKS - CONDITION FIELDS
// ============================================================================

/**
 * Hook for updating a single condition field with optimistic updates
 *
 * Updates a specific field on a condition (e.g., name, pitchPoints, category).
 * Implements optimistic updates for instant UI feedback, with automatic rollback
 * on errors.
 *
 * Mutation Flow:
 * 1. Immediately update UI with new value (optimistic)
 * 2. Send update to database
 * 3. On success: Refresh materialized view, invalidate cache
 * 4. On error: Rollback to previous value
 *
 * @returns {UseMutationResult} React Query mutation result
 * @property {Function} mutate - Trigger the mutation
 * @property {Function} mutateAsync - Async version of mutate
 * @property {boolean} isPending - True while mutation is in progress
 * @property {boolean} isError - True if mutation failed
 * @property {Error} error - Error object if mutation failed
 *
 * @example
 * const updateField = useUpdateConditionField();
 *
 * const handleNameChange = (newName) => {
 *   updateField.mutate({
 *     conditionId: 123,
 *     field: 'name',
 *     value: newName
 *   });
 * };
 *
 * // With error handling
 * updateField.mutate(
 *   { conditionId: 123, field: 'pitch_points', value: 'New pitch' },
 *   {
 *     onSuccess: () => console.log('Updated successfully'),
 *     onError: (error) => console.error('Update failed:', error)
 *   }
 * );
 */
export const useUpdateConditionField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conditionId, field, value }) =>
      updateConditionFieldRealtime(conditionId, field, value),

    // Optimistic update - immediately update UI
    onMutate: async ({ conditionId, field, value }) => {
      // Cancel outgoing queries to avoid race conditions
      await queryClient.cancelQueries({ queryKey: conditionKeys.lists() });

      // Snapshot previous value for rollback
      const previous = queryClient.getQueryData(conditionKeys.lists());

      // Optimistically update cache
      queryClient.setQueryData(conditionKeys.lists(), (old) => {
        if (!old) return old;
        return old.map(condition =>
          condition.db_id === conditionId
            ? { ...condition, [field]: value }
            : condition
        );
      });

      return { previous };
    },

    // On error, rollback to previous state
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(conditionKeys.lists(), context.previous);
      }
      console.error('Failed to update condition field:', err);
    },

    // After mutation completes (success or failure), refresh view and refetch
    onSettled: async () => {
      await refreshProceduresView();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },
  });
};

/**
 * Hook for adding a phase to a condition
 *
 * Adds a treatment phase (Prep, Acute, Maintenance) to a condition. Creates the
 * phase if it doesn't exist, then links it to the procedure.
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const addPhase = useAddPhaseToCondition();
 *
 * addPhase.mutate({
 *   conditionId: 123,
 *   phaseName: 'Maintenance'
 * });
 */
export const useAddPhaseToCondition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conditionId, phaseName }) =>
      addPhaseToConditionRealtime(conditionId, phaseName),

    onMutate: async ({ conditionId, phaseName }) => {
      await queryClient.cancelQueries({ queryKey: conditionKeys.lists() });
      const previous = queryClient.getQueryData(conditionKeys.lists());

      queryClient.setQueryData(conditionKeys.lists(), (old) => {
        if (!old) return old;
        return old.map(condition =>
          condition.db_id === conditionId
            ? { ...condition, phases: [...(condition.phases || []), phaseName] }
            : condition
        );
      });

      return { previous };
    },

    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(conditionKeys.lists(), context.previous);
      }
      console.error('Failed to add phase:', err);
    },

    onSettled: async () => {
      await refreshProceduresView();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },
  });
};

/**
 * Hook for removing a phase from a condition
 *
 * Removes a treatment phase from a condition. Also removes all products associated
 * with that phase. Deletes orphaned phases that aren't used by any other conditions.
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const removePhase = useRemovePhaseFromCondition();
 *
 * removePhase.mutate({
 *   conditionId: 123,
 *   phaseName: 'Prep'
 * });
 */
export const useRemovePhaseFromCondition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conditionId, phaseName }) =>
      removePhaseFromConditionRealtime(conditionId, phaseName),

    onMutate: async ({ conditionId, phaseName }) => {
      await queryClient.cancelQueries({ queryKey: conditionKeys.lists() });
      const previous = queryClient.getQueryData(conditionKeys.lists());

      queryClient.setQueryData(conditionKeys.lists(), (old) => {
        if (!old) return old;
        return old.map(condition =>
          condition.db_id === conditionId
            ? {
                ...condition,
                phases: (condition.phases || []).filter(p => p !== phaseName)
              }
            : condition
        );
      });

      return { previous };
    },

    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(conditionKeys.lists(), context.previous);
      }
      console.error('Failed to remove phase:', err);
    },

    onSettled: async () => {
      await refreshProceduresView();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },
  });
};

// ============================================================================
// MUTATION HOOKS - PRODUCTS
// ============================================================================

/**
 * Hook for adding a product to a patient type/phase combination
 *
 * Associates a product with a specific treatment phase and patient type for a
 * condition. Creates entries in procedure_phase_products table.
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const addProduct = useAddProductToPatientType();
 *
 * addProduct.mutate({
 *   conditionId: 123,
 *   phaseName: 'Acute',
 *   patientTypeName: 'Type 2',
 *   productName: 'PerioScience Gel'
 * });
 */
export const useAddProductToPatientType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conditionId, phaseName, patientTypeName, productName }) =>
      addProductToPatientTypeRealtime(conditionId, phaseName, patientTypeName, productName),

    onMutate: async ({ conditionId, phaseName, patientTypeName, productName }) => {
      await queryClient.cancelQueries({ queryKey: conditionKeys.lists() });
      const previous = queryClient.getQueryData(conditionKeys.lists());

      queryClient.setQueryData(conditionKeys.lists(), (old) => {
        if (!old) return old;
        return old.map(condition => {
          if (condition.db_id !== conditionId) return condition;

          const updatedConfig = { ...(condition.patientSpecificConfig || {}) };
          if (!updatedConfig[phaseName]) {
            updatedConfig[phaseName] = {};
          }
          if (!updatedConfig[phaseName][patientTypeName]) {
            updatedConfig[phaseName][patientTypeName] = [];
          }
          if (!updatedConfig[phaseName][patientTypeName].includes(productName)) {
            updatedConfig[phaseName][patientTypeName] = [
              ...updatedConfig[phaseName][patientTypeName],
              productName
            ];
          }

          return { ...condition, patientSpecificConfig: updatedConfig };
        });
      });

      return { previous };
    },

    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(conditionKeys.lists(), context.previous);
      }
      console.error('Failed to add product to patient type:', err);
    },

    onSettled: async () => {
      await refreshProceduresView();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },
  });
};

/**
 * Hook for removing a product from a patient type/phase combination
 *
 * Removes the association between a product and a specific treatment phase/patient
 * type for a condition.
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const removeProduct = useRemoveProductFromPatientType();
 *
 * removeProduct.mutate({
 *   conditionId: 123,
 *   phaseName: 'Acute',
 *   patientTypeName: 'Type 2',
 *   productName: 'PerioScience Gel'
 * });
 */
export const useRemoveProductFromPatientType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conditionId, phaseName, patientTypeName, productName }) =>
      removeProductFromPatientTypeRealtime(conditionId, phaseName, patientTypeName, productName),

    onMutate: async ({ conditionId, phaseName, patientTypeName, productName }) => {
      await queryClient.cancelQueries({ queryKey: conditionKeys.lists() });
      const previous = queryClient.getQueryData(conditionKeys.lists());

      queryClient.setQueryData(conditionKeys.lists(), (old) => {
        if (!old) return old;
        return old.map(condition => {
          if (condition.db_id !== conditionId) return condition;

          const updatedConfig = { ...(condition.patientSpecificConfig || {}) };
          if (updatedConfig[phaseName]?.[patientTypeName]) {
            updatedConfig[phaseName][patientTypeName] = updatedConfig[phaseName][patientTypeName]
              .filter(p => p !== productName);
          }

          return { ...condition, patientSpecificConfig: updatedConfig };
        });
      });

      return { previous };
    },

    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(conditionKeys.lists(), context.previous);
      }
      console.error('Failed to remove product from patient type:', err);
    },

    onSettled: async () => {
      await refreshProceduresView();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },
  });
};

/**
 * Hook for updating product details for a condition
 *
 * Updates specific fields in the product_details table (scientific_rationale,
 * clinical_evidence, pitch_points, etc.). Creates the product_details entry if
 * it doesn't exist.
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const updateDetail = useUpdateProductDetail();
 *
 * updateDetail.mutate({
 *   conditionId: 123,
 *   productName: 'PerioScience Gel',
 *   field: 'scientific_rationale',
 *   value: 'Contains xylitol which inhibits bacterial growth...'
 * });
 */
export const useUpdateProductDetail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conditionId, productName, field, value }) =>
      updateProductDetailRealtime(conditionId, productName, field, value),

    onMutate: async ({ conditionId, productName, field, value }) => {
      await queryClient.cancelQueries({ queryKey: conditionKeys.lists() });
      const previous = queryClient.getQueryData(conditionKeys.lists());

      queryClient.setQueryData(conditionKeys.lists(), (old) => {
        if (!old) return old;
        return old.map(condition => {
          if (condition.db_id !== conditionId) return condition;

          const updatedDetails = { ...(condition.productDetails || {}) };
          if (!updatedDetails[productName]) {
            updatedDetails[productName] = {};
          }
          updatedDetails[productName] = {
            ...updatedDetails[productName],
            [field]: value
          };

          return { ...condition, productDetails: updatedDetails };
        });
      });

      return { previous };
    },

    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(conditionKeys.lists(), context.previous);
      }
      console.error('Failed to update product detail:', err);
    },

    onSettled: async () => {
      await refreshProceduresView();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },
  });
};

// ============================================================================
// MUTATION HOOKS - CATEGORIES
// ============================================================================

/**
 * Hook for adding a new category
 *
 * Creates a new condition category in the database. Categories are used to
 * organize conditions (e.g., "Periodontal", "Restorative", "Orthodontic").
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const addCategory = useAddCategory();
 *
 * addCategory.mutate({ categoryName: 'Orthodontic' });
 */
export const useAddCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryName }) => addCategoryRealtime(categoryName),

    onSuccess: () => {
      invalidateConditionsCache();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },

    onError: (err) => {
      console.error('Failed to add category:', err);
    },
  });
};

/**
 * Hook for deleting a category
 *
 * Deletes a category from the database. Also updates any conditions using this
 * category to have null category_id.
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const deleteCategory = useDeleteCategory();
 *
 * deleteCategory.mutate({ categoryName: 'Orthodontic' });
 */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryName }) => deleteCategoryRealtime(categoryName),

    onSuccess: () => {
      invalidateConditionsCache();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },

    onError: (err) => {
      console.error('Failed to delete category:', err);
    },
  });
};

// ============================================================================
// MUTATION HOOKS - DDS TYPES
// ============================================================================

/**
 * Hook for adding a new DDS type
 *
 * Creates a new dentist/DDS type in the database. DDS types categorize dental
 * professionals (e.g., "Periodontist", "General Dentist", "Oral Surgeon").
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const addDdsType = useAddDdsType();
 *
 * addDdsType.mutate({ ddsTypeName: 'Endodontist' });
 */
export const useAddDdsType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ddsTypeName }) => addDdsTypeRealtime(ddsTypeName),

    onSuccess: () => {
      invalidateConditionsCache();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },

    onError: (err) => {
      console.error('Failed to add DDS type:', err);
    },
  });
};

/**
 * Hook for deleting a DDS type
 *
 * Deletes a DDS type from the database. Also removes all procedure_dentists
 * relationships using this DDS type.
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const deleteDdsType = useDeleteDdsType();
 *
 * deleteDdsType.mutate({ ddsTypeName: 'Endodontist' });
 */
export const useDeleteDdsType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ddsTypeName }) => deleteDdsTypeRealtime(ddsTypeName),

    onSuccess: () => {
      invalidateConditionsCache();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },

    onError: (err) => {
      console.error('Failed to delete DDS type:', err);
    },
  });
};

// ============================================================================
// MUTATION HOOKS - PRODUCT MANAGEMENT
// ============================================================================

/**
 * Hook for adding a new product
 *
 * Creates a new product in the database. Products can then be associated with
 * conditions, phases, and patient types.
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const addProduct = useAddProduct();
 *
 * addProduct.mutate({ productName: 'New Gel Formula' });
 */
export const useAddProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productName }) => addProductRealtime(productName),

    onSuccess: () => {
      invalidateConditionsCache();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },

    onError: (err) => {
      console.error('Failed to add product:', err);
    },
  });
};

/**
 * Hook for renaming a product
 *
 * Updates a product's name in the database. All references to this product
 * across the system will reflect the new name.
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const renameProduct = useRenameProduct();
 *
 * renameProduct.mutate({
 *   oldName: 'Old Gel Formula',
 *   newName: 'Advanced Gel Formula'
 * });
 */
export const useRenameProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ oldName, newName }) => renameProductRealtime(oldName, newName),

    onSuccess: () => {
      invalidateConditionsCache();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },

    onError: (err) => {
      console.error('Failed to rename product:', err);
    },
  });
};

/**
 * Hook for deleting a product
 *
 * Deletes a product from the database. Also removes all related data:
 * - procedure_phase_products entries
 * - competitive_advantage entries
 * - product_details entries
 *
 * WARNING: This is a destructive operation that cannot be undone.
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const deleteProduct = useDeleteProduct();
 *
 * deleteProduct.mutate({ productName: 'Discontinued Gel' });
 */
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productName }) => deleteProductRealtime(productName),

    onSuccess: () => {
      invalidateConditionsCache();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },

    onError: (err) => {
      console.error('Failed to delete product:', err);
    },
  });
};

// ============================================================================
// MUTATION HOOKS - CONDITION CRUD
// ============================================================================

/**
 * Hook for adding a new condition
 *
 * Creates a complete new condition with all related data (phases, products,
 * patient types, etc.). Requires entity ID maps for lookups.
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const addCondition = useAddCondition();
 *
 * const handleAddCondition = async () => {
 *   const entityIdMaps = await getEntityIdMaps();
 *
 *   addCondition.mutate({
 *     condition: {
 *       name: 'Gingivitis',
 *       category: 'Periodontal',
 *       phases: ['Prep', 'Acute', 'Maintenance'],
 *       pitchPoints: 'Early stage gum disease...',
 *       // ... other fields
 *     },
 *     entityIdMaps
 *   });
 * };
 */
export const useAddCondition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ condition, entityIdMaps }) => {
      const maps = entityIdMaps || await getEntityIdMaps();
      return addConditionToSupabase(condition, maps);
    },

    onSuccess: () => {
      invalidateConditionsCache();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },

    onError: (err) => {
      console.error('Failed to add condition:', err);
    },
  });
};

/**
 * Hook for updating an entire condition
 *
 * Updates a complete condition with all related data. Uses diff-based approach
 * for efficient updates. Requires entity ID maps for lookups.
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const updateCondition = useUpdateCondition();
 *
 * const handleUpdateCondition = async (updatedCondition) => {
 *   const entityIdMaps = await getEntityIdMaps();
 *
 *   updateCondition.mutate({
 *     condition: updatedCondition,
 *     entityIdMaps
 *   });
 * };
 */
export const useUpdateCondition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ condition, entityIdMaps }) => {
      const maps = entityIdMaps || await getEntityIdMaps();
      return updateConditionInSupabase(condition, maps);
    },

    onSuccess: () => {
      invalidateConditionsCache();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },

    onError: (err) => {
      console.error('Failed to update condition:', err);
    },
  });
};

/**
 * Hook for deleting a condition
 *
 * Deletes a condition and all related data in cascade:
 * - phase_specific_usage entries
 * - condition_product_research_articles entries
 * - procedure_phase_products entries
 * - product_details entries
 * - procedure_phases entries
 * - procedure_dentists entries
 * - procedures entry
 *
 * WARNING: This is a destructive operation that cannot be undone.
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const deleteCondition = useDeleteCondition();
 *
 * const handleDelete = () => {
 *   if (confirm('Are you sure you want to delete this condition?')) {
 *     deleteCondition.mutate({ conditionId: 123 });
 *   }
 * };
 */
export const useDeleteCondition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conditionId }) => deleteConditionFromSupabase(conditionId),

    onMutate: async ({ conditionId }) => {
      await queryClient.cancelQueries({ queryKey: conditionKeys.lists() });
      const previous = queryClient.getQueryData(conditionKeys.lists());

      // Optimistically remove from cache
      queryClient.setQueryData(conditionKeys.lists(), (old) => {
        if (!old) return old;
        return old.filter(condition => condition.db_id !== conditionId);
      });

      return { previous };
    },

    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(conditionKeys.lists(), context.previous);
      }
      console.error('Failed to delete condition:', err);
    },

    onSuccess: () => {
      invalidateConditionsCache();
      queryClient.invalidateQueries({ queryKey: conditionKeys.all });
    },
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Query hooks
  useConditions,
  useCondition,

  // Mutation hooks - Fields
  useUpdateConditionField,
  useAddPhaseToCondition,
  useRemovePhaseFromCondition,

  // Mutation hooks - Products
  useAddProductToPatientType,
  useRemoveProductFromPatientType,
  useUpdateProductDetail,

  // Mutation hooks - Categories
  useAddCategory,
  useDeleteCategory,

  // Mutation hooks - DDS Types
  useAddDdsType,
  useDeleteDdsType,

  // Mutation hooks - Product Management
  useAddProduct,
  useRenameProduct,
  useDeleteProduct,

  // Mutation hooks - Condition CRUD
  useAddCondition,
  useUpdateCondition,
  useDeleteCondition,

  // Query keys
  conditionKeys,
};
