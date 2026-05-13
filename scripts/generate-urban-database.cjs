'use strict'

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const PROJECT_ROOT = path.resolve(__dirname, '..')
const inputPath = path.resolve(process.argv[2] || path.join(PROJECT_ROOT, 'a.txt'))
const outputPath = path.resolve(process.argv[3] || path.join(PROJECT_ROOT, 'src', 'features', 'dictionary', 'urban_database.json'))

const TARGET_RELATED_PER_CATEGORY = 24

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactKey(text) {
  return normalize(text).replace(/[\s-]+/g, '')
}

function repairMojibake(value) {
  const text = String(value || '')
  if (!/[ÃÂ]/.test(text)) return text
  try {
    const encoded = Array.from(text)
      .map(ch => {
        const code = ch.charCodeAt(0)
        return code <= 255 ? `%${code.toString(16).padStart(2, '0')}` : ch
      })
      .join('')
    return decodeURIComponent(encoded)
  } catch {
    return text
  }
}

function uniq(items) {
  return [...new Set(items.map(x => String(x || '').trim()).filter(Boolean))]
}

function splitList(value) {
  return uniq(value.split(',').map(x => repairMojibake(x.trim())))
}

function stemOf(word) {
  let w = compactKey(word)
  const suffixes = [
    'mente', 'zmente', 'coes', 'cao', 'sao', 'dade', 'dades', 'ismo', 'ismos',
    'ista', 'istas', 'eiro', 'eira', 'eiros', 'eiras', 'oso', 'osa', 'osos', 'osas',
    'ado', 'ada', 'ados', 'adas', 'ido', 'ida', 'idos', 'idas', 'ante', 'antes',
    'avel', 'ivel', 'ais', 'eis', 'oes', 'ar', 'er', 'ir', 'ou', 'eu', 'iu'
  ]
  for (const suffix of suffixes) {
    if (w.length > suffix.length + 3 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length)
      break
    }
  }
  return w.length >= 4 ? w : compactKey(word)
}

function suffixesOf(word) {
  const w = compactKey(word)
  const out = []
  for (const size of [6, 5, 4]) {
    if (w.length > size + 1) out.push(w.slice(-size))
  }
  return out
}

function parseCategory(row) {
  const [id, label, keys, slang, formal] = row.split('|')
  const keyList = splitList(keys)
  const slangList = splitList(slang)
  const formalList = splitList(formal)
  return {
    id,
    label: repairMojibake(label),
    keys: keyList,
    girias: slangList,
    semanticSeeds: formalList,
    stems: uniq([...keyList, ...formalList].map(stemOf).filter(x => x.length >= 4)),
    suffixes: uniq([...keyList, ...formalList].flatMap(suffixesOf)),
  }
}

// 100 categorias: SP, RJ, BH, Sul, Nordeste, Drill, Funk, Trap, Plug e estúdio.
const RAW_CATEGORIES = [
  'dinheiro|Dinheiro / Grana|dinheiro,grana,lucro,riqueza,pagamento,nota,cash|malote,placo,mola,cascalho,nota,cifrão,verdinha,dim,capital,bolo,bag,cheque, pix pesado, conta cheia|dinheiro,capital,quantia,pagamento,lucro,renda,riqueza,salario,fortuna,ganho,provento,receita',
  'ostentacao|Ostentação|ostentacao,ostentar,luxo,exibir,brilho,status|ostenta,brabo,patrao,de nave,cheio de ouro,vida cara,na vitrine,grife no corpo,sem miseria,alto padrao|luxo,requinte,exibicao,prestigio,status,opulencia,abundancia,riqueza,glamour,visibilidade',
  'luxo|Luxo / Alto Padrão|luxo,caro,premium,fino,nobre,sofisticado|fino,trajado,caro,chique,classe A,na elegancia,no luxo,vida premium,peca rara,alto nivel|sofisticado,refinado,nobre,elegante,requintado,precioso,exclusivo,valioso,superior',
  'carros|Carros / Nave|carro,veiculo,automovel,motor,volante,rua|nave,barca,maquina,caranga,foguete,blindado,carrão,possante,importado,brinquedo,auto,quatro rodas|carro,veiculo,automovel,motor,transporte,maquina,conducao,velocidade,estrada,volante',
  'motos|Motos / Grau|moto,motocicleta,grau,duas rodas,escape|foguetinho,camelo,grau,corte de giro,duas rodas,sem placa,escape aberto,bololo,role de cria,randandan|moto,motocicleta,velocidade,escape,piloto,garupa,rua,asfalto,viagem,curva',
  'joias|Joias / Brilho|joia,corrente,anel,relogio,ouro,prata,diamante|ice,gelo,corrente,pingente,grillz,relógio,ouro no peito,prata,bracelete,brilhando,kit gelo|joia,brilho,diamante,ouro,prata,anel,corrente,relogio,pingente,ornamento',
  'roupa|Roupa / Kit|roupa,estilo,vestimenta,moda,look,traje|drip,sauce,kit,trajado,pano,peita,camisa,boot,moletom,lacoste,nikeira,grife,trapstar|roupa,traje,vestimenta,estilo,moda,visual,aparencia,figurino,look,camisa',
  'marcas|Marcas / Grife|marca,grife,designer,importado,colecao|nikeira,lacoste,oakley,adidas,gucci,prada,lv,balenciaga,trapstar,high,grife,marca forte|marca,grife,designer,etiqueta,colecao,produto,importado,moda,estilo,qualidade',
  'quebrada|Quebrada / Favela|favela,quebrada,bairro,viela,comunidade,periferia|quebrada,favela,vila,bloco,beco,viela,morro,comunidade,perifa,complexo,miolo,area|bairro,comunidade,periferia,favela,vila,localidade,territorio,regiao,rua,origem',
  'rua|Rua / Asfalto|rua,asfalto,calcada,esquina,beco,viela|asfalto,pista,esquina,beco,corre,rua fria,base,area,plantao,linha de frente,calçada,poste|rua,asfalto,caminho,avenida,travessa,calcada,esquina,espaco,territorio,cidade',
  'sp|Vivência SP|sao paulo,sp,zona leste,zona sul,centro,capital|selva de pedra,zl,zs,centrao,quebrada paulista,linha azul,radial,paulista,corre sp,giro na city|cidade,metropole,capital,bairro,regiao,avenida,transito,pressa,trabalho,concreto',
  'rj|Vivência RJ|rio,janeiro,morro,complexo,zona norte,zona oeste|morro,complexo,baile,asfalto,carioca,cria do rio,pista salgada,visao do morro,orla,zn,zona oeste|cidade,praia,morro,comunidade,baile,calor,regiao,territorio,rua,vivencia',
  'bh|Vivência BH / Minas|bh,minas,belohorizonte,aglomerado,capital|belzonte,bh,aglomerado,quebrada mineira,trem,uve,rolê mineiro,capital do pão de queijo,visao 31|cidade,capital,montanha,bairro,regiao,mina,interior,rua,vivencia,cultura',
  'sul|Vivência Sul|sul,curitiba,porto alegre,floripa,frio,fronteira|guri,pila,tri,quebrada sulista,fronteira,frio na pista,role sul,capital gelada,mano do sul|regiao,frio,fronteira,cidade,bairro,interior,cultura,rua,territorio,vivencia',
  'nordeste|Vivência Nordeste|nordeste,recife,salvador,fortaleza,bahia,pernambuco|oxe,visse,mainha,quebrada nordestina,paredao,brocar,arrasta,calor do corre,litoral,sertão|regiao,calor,cultura,litoral,sertao,cidade,bairro,povo,raiz,origem',
  'policia|Polícia / Sistema|policia,sistema,viatura,abordagem,lei,estado|os homem,giroflex,barca,coroa,choque,caveirao,blindado,farda,canetada,abordagem,radinho,coruja|policia,autoridade,estado,lei,viatura,fiscalizacao,controle,justica,ordem,repressao',
  'perseguicao|Fuga / Perseguição|fuga,perseguir,correr,escapar,rasgar,evadir|vazar,ralar,meter o pe,cortar giro,sair vazado,virar fumaça,zarpar,ciscou,partiu,desapareceu|fuga,escape,saida,corrida,retirada,desvio,evadir,distancia,pressa,velocidade',
  'armas|Armas / Peça|arma,pistola,revolver,municao,tiro,calibre|peça,ferro,bico,brinquedo,artigo,grude,instrumento,preta,maquininha,cano,calibre,municao|arma,pistola,revolver,municao,disparo,calibre,metal,defesa,risco,perigo',
  'conflito|Conflito / Treta|conflito,briga,treta,guerra,rixa,ataque|treta,caô,bo,problema,clima quente,embate,x1,faísca,guerra fria,atrito,bronca|conflito,briga,disputa,rixa,embate,oposicao,tensao,violencia,ataque,problema',
  'risco|Risco / Perigo|risco,perigo,ameaça,medo,tensao,alerta|pista salgada,clima pesado,perigo na area,rua quente,sem mole,visao dobrada,radar ligado,alerta,pé atras|risco,perigo,ameaca,tensao,cuidado,alerta,medo,incerteza,instabilidade',
  'lealdade|Lealdade / Fé|lealdade,fiel,verdadeiro,confianca,parceiro,firmeza|de fé,fechamento,100%,lado a lado,real,parça firme,sangue bom,base,blindado,sem curva|lealdade,fidelidade,confianca,verdade,compromisso,apoio,parceria,uniao,respeito',
  'falsidade|Falsidade / Traição|falso,mentira,traicao,fraude,enganar,duas caras|caô,migue,cap,judas,rato,cobra,x9,falso profeta,comedia,mascara,traíra,zé povinho|falsidade,mentira,engano,fraude,traicao,hipocrisia,ilusão,deslealdade,mascara',
  'inveja|Inveja / Olho Gordo|inveja,invejoso,olho gordo,zoi,secador,recalk|zoião,olho gordo,secador,recalque,invejinha,zica,urubu,energia torta,olho seco,haters|inveja,ciume,recalque,ressentimento,amargura,hostilidade,despeito,negatividade',
  'progresso|Progresso / Vitória|progresso,vitoria,conquista,evolucao,crescer,melhorar|evoluiu,virou chave,subiu de nivel,venceu,brocou,chegou,fez historia,passo largo,foi pra cima|progresso,evolucao,crescimento,vitoria,conquista,melhoria,desenvolvimento,avanco,sucesso',
  'sucesso|Sucesso / Estouro|sucesso,fama,estourar,viral,notoriedade,gloria|estourou,viralizou,furou bolha,ta no hype,ta no topo,brilhou,hitou,explodiu,fez barulho|sucesso,fama,gloria,prestigio,reconhecimento,exito,triunfo,notoriedade,alcance',
  'hustle|Corre / Trabalho|trabalho,corre,esforco,missao,rotina,servico|corre,trampo,missao,plantao,correria,lida,batente,na luta,sem pausa,modo trabalho|trabalho,esforco,rotina,servico,atividade,ocupacao,missao,empreendimento,dedicacao',
  'estudio|Estúdio / Gravação|estudio,gravar,microfone,beat,voz,producao|booth,rec,dropa,track,beat,voz guia,sessao,plugou no mic,take,master,stem,projeto|estudio,gravacao,microfone,producao,musica,voz,faixa,audio,arranjo,composicao',
  'flow|Flow / Cadência|flow,cadencia,ritmo,levada,compasso,barra|flow,levada,cadencia,gingado,pocket,encaixe,balanco,drip vocal,modo,delivery|ritmo,cadencia,compasso,levada,melodia,voz,pausa,tempo,balanco,fluencia',
  'punchline|Punchline / Barra|punchline,barra,frase,impacto,trocadilho,verso|punch,barra,pedrada,lapada,linha pesada,canetada,frase de efeito,marretada,tiro de meta|frase,verso,impacto,trocadilho,ideia,expressao,linha,argumento,efeito',
  'drill|Drill / Sombrio|drill,grave,sombrio,808,ukdrill,nydrill|drill,grave seco,808 sujo,flow quebrado,energia dark,pisada,batida seca,slide,modo sombra|grave,ritmo,sombrio,batida,intenso,seco,energia,rua,tensao,musica',
  'trap|Trap / Trap BR|trap,808,hi hat,plug,melodia,autotune|trap,808,hi-hat,plug,melodia triste,autotune,adlib,slime,vibe,drop,clap seco|batida,melodia,grave,musica,voz,efeito,ritmo,producao,estilo',
  'plug|Plug / Melódico|plug,pluggnb,melodico,sonho,beat leve|plug,pluggnb,melodia doce,beat flutuante,vibe,sonho,cloud,soft,glow,808 macio|melodia,suave,sonho,leveza,ritmo,voz,atmosfera,musica,emocao',
  'funk|Funk / Baile|funk,baile,mandela,paredao,dj,mc|baile,mandelão,paredão,tamborzão,bruxaria,fluxo,passinho,grave,automotivo,mc,dj|baile,danca,ritmo,grave,festa,musica,comunidade,evento,celebracao',
  'funkconsciente|Funk Consciente|consciente,reflexao,vivencia,realidade,letra|consciente,papo reto,visão,relato,vivência,realidade nua,sem filtro,voz da rua,recado|reflexao,realidade,consciencia,vivencia,relato,verdade,mensagem,critica,observacao',
  'baile|Festa / Baile|festa,baile,role,evento,noite,fluxo|baile,fluxo,role,after,pista,paredão,mandela,resenha,festinha,noitada,baile de rua|festa,evento,noite,encontro,celebracao,danca,musica,diversao,alegria',
  'bebida|Bebida / Copo|bebida,alcool,copo,drink,dose,gelada|gelada,dose,copo,drink,litrão,latinha,chela,combo,balde,copo roxo|bebida,alcool,dose,copo,cerveja,drink,brinde,celebracao,consumo',
  'lifestyle|Lifestyle / Vivência|vida,lifestyle,rotina,modo,estilo,vivencia|lifestyle,vivência,modo,rotina cara,visão,vida corrida,na pista,sem roteiro,corre diario|vida,rotina,estilo,vivencia,modo,caminho,experiencia,realidade,jornada',
  'drogas_sutil|Lifestyle de Estúdio|fumaca,erva,brisa,onda,studio,lifestyle|brisa,onda,fumaça no ar,calma,zen,session,aroma,relax,mente longe,no clima|calma,relaxamento,onda,brisa,ambiente,clima,aroma,estudio,pausa',
  'amor|Amor / Romance|amor,paixao,relacao,beijo,saudade,casal|crush,mina,novinha,coração,saudade,mel,mozão,contatinho,chamego,fecha comigo|amor,paixao,afeto,relacao,carinho,saudade,desejo,ternura,romance',
  'desilusao|Desilusão / Coração|desilusao,tristeza,coracao,abandono,saudade,fim|coração gelado,sem sentimento,quebrado,na bad,saudade bateu,frio por dentro,drama|tristeza,desilusao,abandono,saudade,dor,frieza,melancolia,perda',
  'familia|Família / Raiz|familia,mae,pai,irmao,casa,raiz|coroa,veia,base,sangue,raiz,casa,meus,irmandade,familia em primeiro,origem|familia,origem,raiz,casa,mae,pai,irmao,base,sangue,ancestralidade',
  'espiritualidade|Fé / Proteção|fe,deus,oracao,proteção,luz,alma|fé,Deus guia,blindado,abençoado,luz,oração,proteção,guia,alma limpa,livramento|fe,espiritualidade,oracao,protecao,luz,esperanca,crenca,alma,benção',
  'medo|Medo / Ansiedade|medo,ansiedade,receio,panico,inseguranca|neurose,mente a mil,travado,apreensivo,frio na barriga,olho aberto,sem dormir|medo,ansiedade,receio,inseguranca,panico,tensao,preocupacao,alerta',
  'odio|Ódio / Raiva|odio,raiva,furia,irritacao,rancor|sangue quente,veneno,odio no peito,furia,sem paciencia,rancor,mente vermelha,explosivo|odio,raiva,furia,rancor,irritacao,hostilidade,violencia,tensao',
  'respeito|Respeito / Moral|respeito,moral,honra,postura,valor|moral,respeito,postura,nome limpo,honra,proceder,caminhada reta,valor,palavra|respeito,honra,moral,valor,postura,dignidade,reconhecimento,consideracao',
  'humildade|Humildade / Simplicidade|humildade,simples,simplicidade,pe no chao|humilde,pé no chão,sem marra,simples,raiz,na moral,baixo perfil,sem ego|humildade,simplicidade,modestia,realidade,discricao,naturalidade,verdade',
  'arrogancia|Arrogância / Marra|arrogancia,marra,ego,soberba,prepotencia|marrento,cheio de marra,ego alto,se achando,metido,palestrinha,banca demais|arrogancia,soberba,prepotencia,orgulho,vaidade,ego,superioridade,desprezo',
  'poder|Poder / Controle|poder,controle,dominio,forca,influencia|poder,controle,manda chuva,chefia,patrão,voz ativa,chave na mão,dominio,mando|poder,controle,dominio,influencia,forca,autoridade,comando,lideranca',
  'chefia|Chefes / Liderança|chefe,lider,comando,patrao,responsavel|chefe,patrão,linha de frente,liderança,capitão,comando,frente,visão de dono|lider,chefe,comando,direcao,gestao,autoridade,responsavel,coordenacao',
  'gangue|Bonde / Tropa|grupo,bonde,tropa,equipe,alianca|bonde,tropa,crew,time,clã,família,quadrilha,lado,irmandade,squad|grupo,equipe,alianca,tropa,coletivo,time,uniao,organizacao,parceria',
  'internet|Internet / Hype|internet,viral,hype,trend,rede,video|hype,viral,trend,engajou,furou bolha,comentado,subiu nas redes,estourado,clipe rodando|internet,rede,viral,visibilidade,alcance,tendencia,publico,midia,comentario',
  'clipe|Clipe / Imagem|clipe,video,camera,cena,imagem,visual|clipe,cena,take,imagem braba,câmera,drone,visual,filmagem,recorte,frame|video,imagem,camera,cena,filmagem,visual,producao,quadro,registro',
  'palco|Palco / Show|show,palco,apresentacao,publico,turne|palco,show,casa cheia,plateia,tour,turnê,ao vivo,mic aberto,luz no rosto|show,palco,apresentacao,publico,evento,turne,concerto,performance',
  'contrato|Contrato / Negócio|contrato,negocio,acordo,assinatura,empresa|deal,contrato,assinou,fechou,parceria,acordo,proposta,negócio,caneta pesada|contrato,acordo,negocio,parceria,empresa,assinatura,proposta,comercial',
  'independente|Independente / DIY|independente,autonomo,sozinho,diy,proprio|independente,faço solo,na raça,do meu jeito,sem gravadora,diy,autonomia,corre proprio|independente,autonomo,proprio,liberdade,autonomia,solo,individual,criacao',
  'gravadora|Gravadora / Indústria|gravadora,industria,label,empresario,mercado|label,gravadora,industria,staff,manager,empresa,mercado,backoffice,executivo|gravadora,industria,empresa,mercado,gestao,contrato,producao,comercial',
  'critica|Crítica / Haters|critica,hater,julgamento,comentario,ataque|hater,crítico de internet,fala demais,paga pau,incomodado,zói grande,comentario torto|critica,julgamento,comentario,ataque,oposicao,desaprovacao,observacao',
  'silencio|Silêncio / Discrição|silencio,quieto,discreto,calado,reserva|low profile,na moita,quieto,sem mídia,caladão,silêncio,sem alarde,off|silencio,discricao,reserva,quietude,calma,segredo,privacidade,oculto',
  'segredo|Segredo / Sigilo|segredo,sigilo,confidencial,oculto,privado|sigilo,na surdina,segredo,off,sem explanar,fechado,baixo tom,em silencio|segredo,sigilo,confidencial,privacidade,misterio,reserva,oculto',
  'mentira|Mentira / Caô|mentira,mentiroso,enganar,falso,fraude|caô,migué,cap,lorota,conversa fiada,historia torta,171,papo furado|mentira,engano,fraude,falsidade,ilusão,lorota,boato,inverdade',
  'verdade|Verdade / Papo Reto|verdade,realidade,sincero,honesto,franqueza|papo reto,real,sem caô,verdade nua,na lata,sincero,sem filtro,papo dez|verdade,realidade,sinceridade,honestidade,franqueza,clareza,transparencia',
  'dor|Dor / Sofrimento|dor,sofrimento,ferida,trauma,luto|dor,ferida,cicatriz,trauma,peso,luto,peito apertado,alma marcada|dor,sofrimento,ferida,trauma,tristeza,angustia,luto,padecimento',
  'cura|Cura / Superação|cura,superacao,recomeco,renascer,melhora|cura,recomeço,virou chave,se levantou,renasceu,superou,respirou,seguiu|cura,superacao,recomeco,recuperacao,melhora,renascimento,restauracao',
  'tempo|Tempo / Momento|tempo,momento,hora,instante,fase|tempo,momento,fase,hora certa,relógio,virada,janela,época,temporada|tempo,momento,hora,instante,fase,periodo,temporada,epoca',
  'noite|Noite / Madrugada|noite,madrugada,escuro,lua,rua vazia|madrugada,noite fria,lua alta,rua vazia,plantão,turno da noite,after,sereno|noite,madrugada,escuro,lua,sereno,sombra,silencio,periodo',
  'dia|Dia / Luz|dia,manha,tarde,luz,sol,clareza|dia claro,sol rachando,manhã,clareou,luz,novo dia,raio,amanheceu|dia,manha,tarde,luz,sol,claridade,amanhecer,periodo',
  'cidade|Cidade / Selva|cidade,metropole,predio,avenida,concreto|city,selva de pedra,prédio,avenida,centro,metropole,concreto,pista urbana|cidade,metropole,avenida,concreto,predio,centro,urbano,rua',
  'natureza|Natureza / Respiro|natureza,mar,ceu,floresta,vento|mar,vento,ceu aberto,verde,respiro,paz,onda,brisa,floresta,raiz|natureza,mar,ceu,vento,floresta,verde,paz,ambiente,terra',
  'alimentacao|Comida / Sobrevivência|comida,alimento,fome,janta,mesa|rango,boia,prato,mesa cheia,larica,janta,almoço,comida no prato|comida,alimento,refeicao,fome,prato,jantar,almoco,sustento',
  'fome|Fome / Ambição|fome,ambicao,vontade,desejo,necessidade|fome de vencer,ambição,sede,querer mais,olho no topo,necessidade,garra|fome,ambicao,vontade,desejo,necessidade,sede,apetite,objetivo',
  'ambicao|Ambição / Meta|ambicao,meta,objetivo,sonho,plano|meta,plano,visão,objetivo,sonho grande,ambição,mirou alto,projeto|ambicao,meta,objetivo,sonho,plano,proposito,aspiracao,alvo',
  'sonho|Sonho / Futuro|sonho,futuro,desejo,esperanca,visao|sonho,visão,futuro,plano,meta,esperança,olho no amanhã,projeto de vida|sonho,futuro,desejo,esperanca,visao,plano,ideal,imaginação',
  'passado|Passado / Memória|passado,memoria,historia,lembranca,origem|passado,memória,cicatriz,história,raiz,lembrança,flashback,tempo antigo|passado,memoria,historia,lembranca,origem,recordacao,experiencia',
  'futuro|Futuro / Visão|futuro,amanha,destino,caminho,plano|futuro,amanhã,visão,destino,próximo passo,caminho,linha do tempo|futuro,amanha,destino,caminho,plano,perspectiva,horizonte',
  'criatividade|Criatividade / Ideia|criatividade,ideia,imaginar,criar,inventar|ideia,caneta quente,mente fértil,criatividade,brainstorm,visão,lapidar,criar|criatividade,ideia,inventividade,imaginacao,criacao,inspiracao,originalidade',
  'escrita|Escrita / Letra|escrita,letra,verso,rima,caderno|letra,verso,caderno,caneta,barras,linha,rima,rascunho,folha,composição|escrita,letra,verso,rima,caderno,texto,composicao,poesia,frase',
  'rima|Rima / Palavra|rima,palavra,som,terminacao,fonetica|rima,encaixe,sonoridade,terminação,barra casada,fonética,jogo de palavra,assonância|rima,palavra,som,fonetica,poesia,terminacao,linguagem,verso',
  'voz|Voz / Presença|voz,timbre,presenca,interpretacao,canto|voz,timbre,presença,delivery,impostação,grave,melodia vocal,assinatura,pegada|voz,timbre,presenca,interpretacao,canto,som,expressao,entonação',
  'energia|Energia / Vibe|energia,vibe,clima,astral,onda|vibe,energia,clima,astral,onda,frequência,humor,pegada,temperatura|energia,vibe,clima,astral,onda,humor,ambiente,atmosfera',
  'raiva_controlada|Agressividade Controlada|agressivo,pressao,pesado,intenso,forte|pesado,agressivo,pressão,sem dó,modo bruto,linha dura,energia forte|agressivo,pressao,intenso,forte,pesado,bruto,rigido,denso',
  'calma|Calma / Frieza|calma,frio,controle,paciencia,sereno|frio,calculista,sereno,calmo,na paz,sem desespero,cabeça fria,controle|calma,frieza,controle,paciencia,serenidade,tranquilidade,equilibrio',
  'esperteza|Esperteza / Malícia|esperteza,malicia,sagaz,inteligente,astucia|malícia,visão,sagacidade,ligeiro,esperto,malandro,noção,radar|esperteza,malicia,astucia,sagacidade,inteligencia,habilidade,percepcao',
  'malandragem|Malandragem / Jogo|malandragem,jogo,manha,truque,manha|malandragem,manha,jogo de cintura,catimba,truque,visão de rua,ginga,malícia|malandragem,manha,astucia,truque,habilidade,jeito,estrategia',
  'estrategia|Estratégia / Plano|estrategia,plano,tatica,calculo,metodo|estratégia,plano,visão,tática,calculado,passo certo,jogada,mente fria|estrategia,plano,tatica,metodo,calculo,organizacao,projeto',
  'derrota|Derrota / Queda|derrota,queda,fracasso,perda,erro|queda,baque,perdeu,fracasso,tropeço,apanhou da vida,erro caro,voltou pro começo|derrota,queda,fracasso,perda,erro,insucesso,tropeço,revés',
  'retorno|Volta / Comeback|volta,retorno,comeback,recomeco,regresso|voltei,comeback,retorno,ressurgiu,de volta,segunda chance,renasci,volta por cima|volta,retorno,recomeco,regresso,restauracao,renascimento,reaparecimento',
  'ranking|Competição / Ranking|competicao,ranking,disputa,topo,melhor|top 1,ranking,pódio,competição,campeão,disputa,melhor da área,primeiro lugar|competicao,ranking,disputa,topo,podio,campeao,vitoria,classificacao',
  'esporte|Esporte / Jogo|esporte,jogo,campeonato,time,bola|jogo,camisa 10,bola,quadra,partida,time,campeonato,treino,atleta|esporte,jogo,campeonato,time,partida,treino,atleta,bola,competicao',
  'tecnologia|Tecnologia / Digital|tecnologia,digital,app,celular,rede|digital,app,online,link,cel,smart,rede,algoritmo,upload,download|tecnologia,digital,aplicativo,celular,rede,sistema,computador,internet',
  'cripto|Cripto / Investimento|cripto,bitcoin,investimento,mercado,ativo|cripto,btc,trade,ativo,carteira,mercado,gráfico,hold,moeda digital|investimento,mercado,ativo,moeda,carteira,capital,risco,lucro',
  'negocio|Negócio / Empreender|negocio,empreender,empresa,venda,cliente|negócio,empreender,venda,cliente,corre legal,loja,marca própria,produto|negocio,empreendimento,empresa,venda,cliente,produto,mercado,comercio',
  'legalidade|Legalidade / Corre Certo|legal,correto,limpo,regular,oficial|corre certo,limpo,legalizado,oficial,na regra,documentado,sem sujeira,regular|legal,correto,regular,oficial,limpo,autorizado,documentado,justo',
  'erro|Erro / Vacilo|erro,vacilo,falha,mancada,bobeira|vacilo,mancada,moscou,errou feio,bobeou,derrapou,pisou na bola,rateou|erro,vacilo,falha,mancada,bobeira,equivoco,deslize,engano',
  'aprendizado|Aprendizado / Lição|aprendizado,licao,ensino,experiencia,maturidade|lição,aprendizado,visão,experiência,pegou a visão,amadureceu,entendeu o jogo|aprendizado,licao,ensino,experiencia,maturidade,conhecimento,sabedoria',
  'saude_mental|Saúde Mental|mente,ansiedade,depressao,psicologico,cabeca|mente pesada,cabeça cheia,neurose,ansiedade,psico,mente blindada,respira,terapia|mente,ansiedade,psicologico,cabeca,saude,equilibrio,emocao,cuidado',
  'solidão|Solidão / Isolamento|solidao,sozinho,isolado,distante,vazio|sozinho,isolado,no canto,vazio,sem ninguém,modo solo,distante,frio|solidao,isolamento,distancia,vazio,ausencia,silencio,tristeza',
  'coletivo|Coletivo / União|coletivo,uniao,juntos,grupo,movimento|juntos,coletivo,movimento,união,tropa,bonde,todo mundo,fechamento geral|coletivo,uniao,grupo,movimento,equipe,juntos,comunidade,parceria',
  'origem|Origem / Raiz|origem,raiz,nascimento,base,infancia|raiz,origem,de onde vim,berço,base,infância,começo,primeira rua|origem,raiz,nascimento,base,infancia,comeco,procedencia,ancestralidade',
  'destino|Destino / Caminho|destino,caminho,rumo,estrada,missao|destino,caminho,rumo,estrada,missão,trilha,rota,linha do tempo|destino,caminho,rumo,estrada,missao,rota,trajeto,direcao',
  'liberdade|Liberdade / Solto|liberdade,livre,solto,independente,aberto|livre,solto,sem corrente,liberdade,asas,fora da jaula,mente livre,sem dono|liberdade,livre,autonomia,independencia,abertura,emancipacao,soltura',
  'prisao2|Aprisionamento / Corrente|prisao,preso,corrente,jaula,limite|preso,jaula,corrente,trancado,sem saída,grade invisível,limite,amarrado|prisao,limite,corrente,jaula,restricao,aprisionamento,confinamento',
  'velocidade|Velocidade / Pressa|velocidade,rapido,pressa,correria,acelerar|veloz,acelerado,sem freio,pressa,voando,na bota,modo turbo,ligeiro|velocidade,rapidez,pressa,correria,aceleracao,agilidade,ligeireza',
  'riqueza_interior|Valor Interior|valor,essencia,carater,alma,interior|valor,essência,caráter,alma,por dentro,coração limpo,riqueza interna,proceder|valor,essencia,carater,alma,interior,dignidade,virtude,profundidade',
  'mulher|Mulher / Presença Feminina|mulher,mina,garota,menina,dama|mina,dama,novinha,princesa,braba,ela,patroa,musa,fechamento feminino|mulher,garota,menina,dama,presenca,parceira,companheira,figura',
  'homem|Homem / Postura Masculina|homem,mano,rapaz,cara,sujeito|mano,cara,parça,brabo,sujeito,cria,maloka,homem de palavra|homem,rapaz,cara,sujeito,pessoa,figura,individuo,companheiro',
  'cria|Cria / Pertencimento|cria,nativo,local,pertencer,area|cria,da área,nativo,da quebrada,filho da vila,raiz local,conhecido,da casa|local,nativo,origem,pertencimento,area,comunidade,territorio',
  'visao|Visão / Consciência|visao,consiencia,noção,percepcao,entender|visão,noção,pegou a visão,mente aberta,leitura de jogo,sacou,entendeu,radar|visao,consciencia,percepcao,noção,entendimento,clareza,sabedoria',
  'ignorancia|Ignorância / Sem Noção|ignorancia,burro,sem nocao,cego,desinformado|sem visão,sem noção,cego,viajando,moscou,cabeça fechada,fora da casinha|ignorancia,desinformacao,cegueira,erro,desconhecimento,confusao',
  'paz|Paz / Trégua|paz,calma,tregua,harmonia,sossego|paz,sossego,sem guerra,trégua,calmaria,na tranquilidade,zen,harmonia|paz,calma,tregua,harmonia,sossego,tranquilidade,serenidade,equilibrio',
  'guerra|Guerra / Batalha|guerra,batalha,luta,combate,confronto|guerra,batalha,combate,linha de frente,luta,sem trégua,confronto,modo guerra|guerra,batalha,luta,combate,confronto,disputa,ataque,defesa',
  'clima|Clima / Ambiente|clima,ambiente,atmosfera,energia,situacao|clima,ambiente,vibe,atmosfera,energia,temperatura do role,contexto,ar|clima,ambiente,atmosfera,energia,situacao,contexto,cenario',
  'finalizacao|Finalização / Fechamento|fim,final,encerrar,fechar,concluir|fechamento,finalizou,encerrou,botou ponto,fechou a conta,última barra,outro|fim,final,encerramento,conclusao,fechamento,termino,desfecho'
]

const categories = RAW_CATEGORIES.map(parseCategory)

function buildLookup(categories) {
  const lookup = {}
  for (const category of categories) {
    for (const key of [...category.keys, ...category.girias]) {
      const k = normalize(key)
      if (!k) continue
      lookup[k] ??= { categoryIds: [], girias: [], sinonimos: [] }
      if (!lookup[k].categoryIds.includes(category.id)) lookup[k].categoryIds.push(category.id)
      lookup[k].girias = uniq([...lookup[k].girias, ...category.girias.filter(x => normalize(x) !== k)])
    }
  }
  return lookup
}

function shouldAttachWord(word, category) {
  const key = compactKey(word)
  if (key.length < 4 || key.length > 24) return false
  return category.semanticSeeds.some(seed => {
    const seedKey = compactKey(seed)
    if (seedKey === key) return true
    if (key === `${seedKey}s`) return true
    if (seedKey.endsWith('ao') && key === `${seedKey.slice(0, -2)}oes`) return true
    return false
  })
}

async function readWordBank(filePath, categories) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`)
  }

  const relatedByCategory = new Map(categories.map(c => [c.id, new Set(c.semanticSeeds)]))
  const wantedSeeds = new Map()
  for (const category of categories) {
    for (const seed of category.semanticSeeds) {
      const k = compactKey(seed)
      if (!k) continue
      if (!wantedSeeds.has(k)) wantedSeeds.set(k, new Set())
      wantedSeeds.get(k).add(category.id)
    }
  }

  let totalLines = 0
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  for await (const line of rl) {
    totalLines++
    const word = normalize(line)
    const key = compactKey(word)
    if (!key || key.length < 4 || key.includes(' ')) continue

    const direct = wantedSeeds.get(key)
    if (direct) {
      for (const categoryId of direct) relatedByCategory.get(categoryId)?.add(word)
    }

    for (const category of categories) {
      const set = relatedByCategory.get(category.id)
      if (!set || set.size >= TARGET_RELATED_PER_CATEGORY) continue
      if (shouldAttachWord(key, category)) set.add(word)
    }
  }

  return { totalLines, relatedByCategory }
}

async function main() {
  console.log(`[urban-db] Lendo word bank: ${inputPath}`)
  console.log(`[urban-db] Saída: ${outputPath}`)

  const { totalLines, relatedByCategory } = await readWordBank(inputPath, categories)
  const categoriesOut = categories.map(category => {
    const related = uniq([...(relatedByCategory.get(category.id) || [])])
      .filter(word => !category.girias.map(normalize).includes(normalize(word)))
      .slice(0, TARGET_RELATED_PER_CATEGORY)

    return {
      id: category.id,
      label: category.label,
      keys: category.keys,
      girias: category.girias,
      sinonimos: related,
      stems: category.stems,
    }
  })

  const lookup = buildLookup(categoriesOut.map(c => ({
    ...c,
    semanticSeeds: c.sinonimos,
  })))

  for (const category of categoriesOut) {
    for (const key of [...category.keys, ...category.sinonimos]) {
      const k = normalize(key)
      if (!k) continue
      lookup[k] ??= { categoryIds: [], girias: [], sinonimos: [] }
      if (!lookup[k].categoryIds.includes(category.id)) lookup[k].categoryIds.push(category.id)
      lookup[k].girias = uniq([...lookup[k].girias, ...category.girias])
      lookup[k].sinonimos = uniq([...lookup[k].sinonimos, ...category.sinonimos.filter(x => normalize(x) !== k)])
    }
  }

  const slangCount = categoriesOut.reduce((sum, c) => sum + c.girias.length, 0)
  const synonymCount = categoriesOut.reduce((sum, c) => sum + c.sinonimos.length, 0)

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: path.basename(inputPath),
    stats: {
      sourceLines: totalLines,
      categories: categoriesOut.length,
      slangItems: slangCount,
      synonymItems: synonymCount,
      lookupKeys: Object.keys(lookup).length,
    },
    categories: categoriesOut,
    lookup,
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8')

  console.log('[urban-db] Concluído.')
  console.log(`[urban-db] Categorias: ${payload.stats.categories}`)
  console.log(`[urban-db] Gírias: ${payload.stats.slangItems}`)
  console.log(`[urban-db] Sinônimos validados pelo a.txt: ${payload.stats.synonymItems}`)
  console.log(`[urban-db] Chaves de busca: ${payload.stats.lookupKeys}`)

  if (payload.stats.synonymItems < 1000) {
    console.warn('[urban-db] Aviso: menos de 1000 sinônimos encontrados. Use um a.txt maior ou mais completo para aumentar a cobertura.')
  }
}

main().catch(err => {
  console.error('[urban-db] Erro:', err.message)
  process.exit(1)
})
