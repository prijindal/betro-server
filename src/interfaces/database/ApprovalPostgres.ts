export interface ApprovalPostgres {
  id: string;
  user_id: string;
  followee_id: string;
  key_id: string;
  group_id: string;
  is_approved: boolean;
}
