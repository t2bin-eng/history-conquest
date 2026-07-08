-- 0008_question_bank_upload.sql
-- 교사 대시보드에서 문제 은행을 엑셀로 업로드할 수 있도록 하는 RPC.
-- question_bank는 answer 컬럼을 학생에게 숨기기 위해 공개 정책이 없으므로,
-- 대량 삽입/요약 조회도 SECURITY DEFINER 함수를 통해서만 가능하게 한다.

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
    delete from question_bank;
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

create or replace function get_question_bank_summary()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total', (select count(*) from question_bank),
    'byDifficulty', (
      select coalesce(jsonb_object_agg(difficulty, cnt), '{}'::jsonb)
      from (select difficulty, count(*) cnt from question_bank group by difficulty) t
    )
  );
$$;

grant execute on function bulk_insert_questions(jsonb, boolean) to anon, authenticated;
grant execute on function get_question_bank_summary() to anon, authenticated;
