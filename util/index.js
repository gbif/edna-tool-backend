
export const objectSwap = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]))
import { createHash } from 'node:crypto'
export const md5 = (content) => {  
    return createHash('md5').update(content).digest('hex')
  }/* const dwcTerms = require('./dwcTerms')
const metaXml = require('./metaXml')
const streamReader = require('./streamReader') */
import dwcTerms from './dwcTerms.js';
import metaXml from './metaXml.js';
// import streamReader from './streamReader.js';
const transformRow = row => Object.keys(row).reduce((acc, cur) => {
  acc[cur] = cur === "DNA_sequence" ? (row?.[cur] || "").toUpperCase() : row[cur]
  return acc;
}, {})    // .map(k => k === "DNA_sequence" ? (row?.[k] || "").toUpperCase() : row[k])

export const getMetaDataRow = (row, addTaxonomy = false) => {
  if(!row?.id){
     console.log(row)
  }
  try {
      let metadata = transformRow(row);
      if(typeof metadata?.["DNA_sequence"] === "string" ) {
          metadata.taxonID = `ASV:${md5( metadata?.["DNA_sequence"])}` 
      }
      if(addTaxonomy){
        metadata.taxonomy = getTaxonomyArray({metadata})
      }
      return {id: row.id, metadata}
  } catch (error) {
     console.log(error)
  }    
}

export const getTaxonomyArray = r => {
  
  // It seems that most applications uses the k__Fungi p__Basidiomycota format for the taxonopmy. Detect if it is given like that, or format it this way
  // TODO What to do about species level? ScientificName may not always be species. Look for binomials? 
  return ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'scientificName'].map(rank => {
    if((r.metadata[rank] || "").startsWith(`${rank.charAt(0)}__`)){
      return r.metadata[rank]
    } else if(rank === 'scientificName' && (r.metadata[rank] || "").indexOf(' ') === -1 && (r.metadata[rank] || "").indexOf('.') === -1 && (r.metadata[rank] || "").indexOf(':')){
      return `${rank.charAt(0)}__${(r.metadata[rank] || "")}_sp` 
    } else {
      return `${rank.charAt(0)}__${(r.metadata[rank] || "").replaceAll(' ', '_')}`
    }
  } )
  

}

export default {
    metaXml,
    dwcTerms,
    objectSwap,
    md5,
    getMetaDataRow,
    getTaxonomyArray
}
