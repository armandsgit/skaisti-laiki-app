-- Step 1: Add temporary text column for category
ALTER TABLE public.professional_profiles 
ADD COLUMN category_new TEXT;

-- Step 2: Copy existing enum values to new text column
UPDATE public.professional_profiles 
SET category_new = category::text;

-- Step 3: Drop the old enum column
ALTER TABLE public.professional_profiles 
DROP COLUMN category;

-- Step 4: Rename new column to category
ALTER TABLE public.professional_profiles 
RENAME COLUMN category_new TO category;

-- Step 5: Make category NOT NULL
ALTER TABLE public.professional_profiles 
ALTER COLUMN category SET NOT NULL;

-- Step 6: Add foreign key constraint to categories table
ALTER TABLE public.professional_profiles 
ADD CONSTRAINT fk_professional_profiles_category 
FOREIGN KEY (category) REFERENCES public.categories(name) 
ON UPDATE CASCADE 
ON DELETE RESTRICT;

-- Step 7: Create index for better query performance
CREATE INDEX idx_professional_profiles_category 
ON public.professional_profiles(category);

-- Step 8: Drop the old enum type (if not used elsewhere)
DROP TYPE IF EXISTS public.service_category CASCADE;