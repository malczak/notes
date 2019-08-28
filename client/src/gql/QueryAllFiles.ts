export default `
    query QueryAllFiles {
        listFiles {
            id
            title
            size
            lastModified
        }
    }
`;
