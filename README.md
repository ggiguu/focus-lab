# FOCUS LAB

한국어 3D 카메라·피사계 심도 시뮬레이터.

초점거리, 조리개, 센서 크기, 카메라 높이와 촬영 거리를 조절해 3D 인물·다층 공원에서 화각과 심도를 확인합니다. 측면도와 A/B 비교가 연동됩니다. 화단·벤치·나무·카페·먼 풍경이 서로 다른 깊이에 배치되어 있습니다.

## 실행

설치나 빌드가 필요 없습니다. 저장소 루트에서 `python3 -m http.server 8000`을 실행한 뒤 `http://localhost:8000/docs/`를 엽니다. 브라우저의 WebGL 지원이 필요합니다.

## GitHub Pages

저장소 Settings → Pages에서 Source를 Deploy from a branch, Branch를 main, Folder를 /docs로 선택한 뒤 Save를 누릅니다.

배포가 성공하면 https://ggiguu.github.io/focus-lab/ 에서 접속할 수 있습니다. 최초 배포에는 잠시 시간이 걸릴 수 있습니다.

## 비용·데이터

시뮬레이션은 방문자의 브라우저에서 실행되며 유료 AI API, 계정 토큰, 파일 업로드 기능을 사용하지 않습니다. 호스팅 플랫폼의 트래픽·사용 한도는 별도로 적용됩니다.

## 제한과 출처

심도·보케는 학습용 근사이며 실제 렌즈의 회절과 고유 보케를 정확히 재현하지 않습니다. 지원 환경에서 브라우저 시각 검증이 추가로 필요합니다.

Three.js r160: MIT, docs/vendor/THREE-LICENSE.txt. Michelle 모델은 Three.js 예제에서 가져온 제3자 자산입니다: https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Michelle.glb . 모델의 공개 재배포·상업 사용 조건은 별도로 확인해야 하며 Three.js 코드의 MIT 라이선스가 모델에 자동 적용되는 것은 아닙니다.
