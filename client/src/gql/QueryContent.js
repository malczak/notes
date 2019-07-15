export default `
    query QueryContent($id: String) {
        getContent(id: $id) {
            id
            title
            size
            lastModified
            content
        }
    }
`;
