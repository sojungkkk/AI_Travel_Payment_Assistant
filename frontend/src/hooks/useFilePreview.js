import { useEffect, useState } from 'react';

export default function useFilePreview(notify) {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!file || file.type === 'application/pdf') { setUrl(''); return; }
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);

  function selectFile(event) {
    const selected = event.target.files[0];
    if (selected && (selected.size > 10 * 1024 * 1024 || !/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(selected.type))) {
      notify(selected.size > 10 * 1024 * 1024 ? '10MB 이하 파일을 선택해 주세요.' : 'JPG, PNG, WebP 또는 PDF 파일을 선택해 주세요.');
      event.target.value = '';
      setFile(null);
      return;
    }
    setFile(selected || null);
  }

  return { url, name: file?.name, selectFile };
}
