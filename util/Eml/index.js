import licenseEnum from "../../enum/license.js"
import {encode} from 'html-entities';

const escapeHtml = (unsafe) => {
    return encode(unsafe, {mode: 'nonAsciiPrintable', level: 'xml'})
}

const getBibliography = (bibliographicReferences) => {
    if(!bibliographicReferences){
        return ""
    } else {
      const refs = bibliographicReferences.map(ref => `<citation identifier="DOI:${escapeHtml(ref?.key)}">${escapeHtml(ref?.value)}</citation>`)
      return `<bibliography>${refs.join("")}</bibliography>`
    }
}

const getMethodSteps = (methodSteps) => {
    if(!methodSteps || methodSteps?.length === 0){
        return null
    } else {
      return methodSteps.map(s => `<methodStep>
      <description>
      <para>${escapeHtml(s)}</para>
      </description>
  </methodStep>`).join("")
    }
}

const getStudyExtent = (extent) => {

    return extent ? `<studyExtent>
    <description>
        <para>${escapeHtml(extent)}</para>
    </description>
</studyExtent>` : null
}

const getSamplingDescription = (description) => {
    return description ? `<samplingDescription>
    <para>${escapeHtml(description)}</para>
</samplingDescription>` : null;
}

const getKeywords = (keywords, keywordThesaurus) => {
    if(!keywords || keywords?.length === 0){
        return ""
    } else {
      let kWords = keywords.map(s => `<keyword>${escapeHtml(s)}</keyword>`).join("")
      return `<keywordSet>${kWords}<keywordThesaurus>${escapeHtml(keywordThesaurus || "N/A")}</keywordThesaurus>
      </keywordSet>`
    }
}

const getComplexType = (entity, attrs, atrrName) => {
    return attrs.find(key => entity.hasOwnProperty(key)) ? `<${atrrName}>` + 
        attrs.map(a => entity?.[a] ? `<${a}>${escapeHtml(entity[a])}</${a}>` : "").join("")
        +  `</${atrrName}>`: "";
}

const getAgent = (agent, type) => {
    if(!agent){
        return ""
    } else {

        const individualName = getComplexType(agent, ['givenName', 'surName'], 'individualName')
        const address = getComplexType(agent, ['deliveryPoint', 'city', 'postalCode', 'administrativeArea', 'country'], 'address');
      return  `<${type}>
    ${individualName}
    ${agent?.organizationName ? `<organizationName>${escapeHtml(agent?.organizationName)}</organizationName>` : ""}
    ${agent?.positionName ? `<positionName>${escapeHtml(agent?.positionName)}</positionName>` : ""}
    ${address}
    ${agent?.phone ? `<phone>${escapeHtml(agent?.phone)}</phone>` : ""}
    ${agent?.electronicMailAddress ? `<electronicMailAddress>${escapeHtml(agent?.electronicMailAddress)}</electronicMailAddress>` : ""}
    ${agent?.userId ? `<userId directory="http://orcid.org/">${escapeHtml(agent?.userId)}</userId>` : ""}
    
    </${type}>`
    } 
}

const getUrl = url => !!url ? `<distribution scope="document">
<online>
    <url function="information">${escapeHtml(url)}</url>
</online>
</distribution>` : ""

export const getEml = ({id, license, title, description, contact, creator, methodSteps, doi, url, bibliographicReferences, keywords, keywordThesaurus, studyExtent, samplingDescription }) => {
    if(!licenseEnum[license]){
        throw "invalid or missing license"
    }
    const steps = getMethodSteps(methodSteps);
    const sampling = [getStudyExtent(studyExtent), getSamplingDescription(samplingDescription)].filter(e => !!e).join("\n");

    return `
    <eml:eml
        xmlns:eml="eml://ecoinformatics.org/eml-2.1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xsi:schemaLocation="eml://ecoinformatics.org/eml-2.1.1 http://rs.gbif.org/schema/eml-gbif-profile/1.1/eml.xsd"
            packageId="${id}"  system="http://gbif.org" scope="system"
      xml:lang="en">
        <dataset>
            ${doi ? `<alternateIdentifier>https://doi.org/${escapeHtml(doi)}</alternateIdentifier>` : ""}
            <title>${escapeHtml(title)}</title>
            ${creator && creator?.length > 0 ? creator.map(c => getAgent(c, 'creator')).join("") : ""}
            <pubDate>
          ${new Date().toISOString().split("T")[0]}
          </pubDate>
            <language>ENGLISH</language>
            <abstract>
            ${description ? `<para>${escapeHtml(description)}</para>` : "" }
            <para>[This dataset was processed using the GBIF eDNA converter tool.]</para>
        </abstract>
            ${getKeywords(keywords, keywordThesaurus)}
            <intellectualRights>
                <para>This work is licensed under a 
                    <ulink url="${licenseEnum[license].url}">
                        <citetitle>${licenseEnum[license].url}</citetitle>
                    </ulink>.
                </para>
            </intellectualRights>
            ${getUrl(url)}
            <maintenance>
                <maintenanceUpdateFrequency>unkown</maintenanceUpdateFrequency>
            </maintenance>
            ${getAgent(contact, 'contact')}
           ${(steps || sampling) ? `<methods>
            ${steps ? steps : ""}
            ${sampling ? "<sampling>" + sampling + "</sampling>": ""}
        </methods>` : ""}
        </dataset>
        <additionalMetadata>
            <metadata>
                <gbif>
                    ${getBibliography(bibliographicReferences)}
                </gbif>
            </metadata>
        </additionalMetadata>
    </eml:eml>`
} 