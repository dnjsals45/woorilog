/**
 * 텍스트를 클립보드에 넣습니다. 성공 여부를 돌려줍니다.
 *
 * `navigator.clipboard` 는 **보안 컨텍스트에서만** 존재합니다 — https 이거나 localhost 일 때뿐입니다.
 * 집에서 `http://woorilog.local` 로 여는 홈 배포에서는 undefined 라, 그대로 부르면 TypeError 로 죽습니다.
 * 그래서 예전 방식(execCommand)을 폴백으로 둡니다.
 *
 * 폴백까지 실패할 수 있으므로(iOS 가 특히 까다롭습니다) 화면은 **원문을 눈으로 보고
 * 길게 눌러 복사할 수 있는 상태**로도 만들어 둬야 합니다. 이 함수의 false 는 그 안내를 띄우라는 뜻입니다.
 */
export async function copyText(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 권한 거부 등. 아래 폴백을 한 번 더 시도합니다.
    }
  }
  return legacyCopy(text)
}

/* execCommand('copy') 는 사용자 제스처 안에서, 선택된 텍스트가 있을 때만 동작합니다.
 * readonly 를 주는 이유는 iOS 에서 키보드가 올라오는 것을 막기 위해서입니다. */
function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;'
  document.body.appendChild(area)

  const selection = document.getSelection()
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  try {
    const range = document.createRange()
    range.selectNodeContents(area)
    selection?.removeAllRanges()
    selection?.addRange(range)
    area.setSelectionRange(0, text.length)
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(area)
    // 사용자가 원래 선택해 둔 것이 있으면 되돌려 놓습니다.
    if (previous) {
      selection?.removeAllRanges()
      selection?.addRange(previous)
    }
  }
}
