import DOMPurify from "dompurify";

/** 교사가 업로드한 문제 텍스트에 포함된 표시용 HTML(문단/강조/자료 박스 등)만
 * 안전하게 허용한다. 스크립트/이벤트 핸들러/링크·이미지 등은 제거해 저장형
 * XSS를 막는다 — style 속성은 인라인 스타일(배경색·테두리 등)을 쓰는 업로드
 * 양식과 호환하기 위해 허용하되, 그 외 위험한 태그/속성은 모두 걸러낸다. */
export function sanitizeQuestionHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["div", "p", "span", "b", "strong", "em", "i", "u", "br", "ul", "ol", "li", "img"],
    ALLOWED_ATTR: ["style", "class", "src", "alt"],
    ALLOW_DATA_ATTR: false,
  });
}

/** 업로드 미리보기처럼 한 줄 요약만 필요한 곳에서, 태그 없는 순수 텍스트로 줄인다. */
export function stripQuestionHtmlForPreview(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).replace(/\s+/g, " ").trim();
}
