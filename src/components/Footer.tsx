interface FooterProps {
    companyName?: string;
    showYear?: boolean;
}

export function Footer({
    companyName = 'Artisan Domain Auditing Platform',
    showYear = true
}: FooterProps = {}) {
    const year = new Date().getFullYear();

    return (
        <footer className="footer">
            <span>{companyName}</span>
            <span>Powered by the <a href="https://www.artisanhosting.net"> Artisan Hosting </a></span>
            {showYear && <span>Copyright ©{year}</span>}
        </footer>
    )
}

export default Footer;

// ©