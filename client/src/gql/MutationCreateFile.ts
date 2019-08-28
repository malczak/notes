export default `
    mutation MutationContent($title: String, $content: String) {
        createFile(title: $title, content: $content) {
            id
            title
            lastModified
        }
    }
`;
