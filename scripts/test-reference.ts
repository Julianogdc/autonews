// Teste da imagem de referência: nunca liberada, com origem e aviso. Não grava nada.
// Uso local: npx tsx scripts/test-reference.ts
import { referenceImage } from '../lib/images/reference';

const withImage = referenceImage({ sourceKey: 'correiodoestado', imageUrl: 'https://exemplo.com/foto.jpg', imageCredit: 'Foto: Fulano' });
const without = referenceImage({ sourceKey: 'topmidia', imageUrl: null, imageCredit: null });

const ok = withImage?.releaseStatus === 'NAO_LIBERADA' && withImage.origin === 'Correio do Estado' && without === null;
console.log(ok ? 'OK: nunca liberada, origem visível, sem imagem não gera referência' : 'ERRO');
console.log(JSON.stringify(withImage, null, 2));

const noCredit = referenceImage({ sourceKey: 'topmidia', imageUrl: 'https://exemplo.com/b.jpg', imageCredit: null });
console.log(noCredit?.credit === 'Crédito não informado pelo portal' ? 'OK: crédito ausente é sinalizado' : 'ERRO: crédito ausente');
