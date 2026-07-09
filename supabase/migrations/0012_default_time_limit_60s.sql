-- 0012_default_time_limit_60s.sql
-- 문제 업로드 시 제한시간을 비워두면 난이도별로 15/18/20초씩 다르게 적용되던 것을,
-- 학생들이 문제를 읽고 풀기엔 너무 촉박하다는 피드백에 따라 난이도 무관 1분(60초)으로 통일한다.

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
    coalesce((q->>'time_limit_sec')::int, 60)
  from jsonb_array_elements(p_questions) as q;

  get diagnostics v_count = row_count;

  return jsonb_build_object('success', true, 'inserted', v_count);
end;
$$;
