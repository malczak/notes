export default `
    mutation MutationContent($id: String!, $title: String, $content: String) {
        updateFile(id: $id, title: $title, content: $content) {
            id
            title
            size
            lastModified
            content
        }
    }
`;
