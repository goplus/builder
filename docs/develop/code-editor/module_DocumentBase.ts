declare interface DocumentBase {
  getDocumentaion(definition: DefinitionIdentifier): Promise<APIReferenceItem>
}
