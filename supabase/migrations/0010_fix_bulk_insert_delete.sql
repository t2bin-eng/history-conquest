-- 0010_fix_bulk_insert_delete.sql
-- bulk_insert_questions의 "delete from question_bank;"가 Supabase의 안전장치
-- (WHERE 절 없는 DELETE/UPDATE 차단)에 막혀 21000 에러가 나던 문제를 수정한다.

create or replace function bulk_insert_questions(
  p_questions jsonb,
  p_replace_existing boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if p_replace_existing then
    delete from question_bank where true;
  end if;

  insert into question_bank (category, difficulty, text, choices, answer, time_limit_sec)
  select
    q->>'category',
    q->>'difficulty',
    q->>'text',
    array(select jsonb_array_elements_text(q->'choices')),
    q->>'answer',
    coalesce(
      (q->>'time_limit_sec')::int,
      case q->>'difficulty'
        when 'LOW' then 15
        when 'MID' then 18
        when 'HIGH' then 20
        else 15
      end
    )
  from jsonb_array_elements(p_questions) as q;

  get diagnostics v_count = row_count;

  return jsonb_build_object('success', true, 'inserted', v_count);
end;
$$;
