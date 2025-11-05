-- Add a trigger to automatically update profiles table when user_items change
CREATE OR REPLACE FUNCTION public.update_balance_from_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_value NUMERIC;
BEGIN
  -- Calculate total inventory value for the user
  SELECT COALESCE(SUM(items.value * user_items.quantity), 0)
  INTO total_value
  FROM public.user_items
  JOIN public.items ON user_items.item_id = items.id
  WHERE user_items.user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  -- Update the user's balance
  UPDATE public.profiles
  SET balance = total_value
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS update_balance_on_item_insert ON public.user_items;
CREATE TRIGGER update_balance_on_item_insert
AFTER INSERT ON public.user_items
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_from_inventory();

-- Create trigger for UPDATE
DROP TRIGGER IF EXISTS update_balance_on_item_update ON public.user_items;
CREATE TRIGGER update_balance_on_item_update
AFTER UPDATE ON public.user_items
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_from_inventory();

-- Create trigger for DELETE
DROP TRIGGER IF EXISTS update_balance_on_item_delete ON public.user_items;
CREATE TRIGGER update_balance_on_item_delete
AFTER DELETE ON public.user_items
FOR EACH ROW
EXECUTE FUNCTION public.update_balance_from_inventory();

-- Update RLS policies for user_items to allow item_managers to insert/update/delete
DROP POLICY IF EXISTS "Item managers can add items to inventories" ON public.user_items;
CREATE POLICY "Item managers can add items to inventories"
ON public.user_items
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'item_manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Item managers can update items in inventories" ON public.user_items;
CREATE POLICY "Item managers can update items in inventories"
ON public.user_items
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'item_manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Item managers can delete items from inventories" ON public.user_items;
CREATE POLICY "Item managers can delete items from inventories"
ON public.user_items
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'item_manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));